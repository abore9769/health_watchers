import { Router, Request, Response } from 'express';
import { authenticate, requireRoles } from '@api/middlewares/auth.middleware';
import { validateRequest } from '@api/middlewares/validate.middleware';
import { z } from 'zod';
import { ConsentModel, CONSENT_TEMPLATES, ConsentType } from './consent.model';
import { auditLog } from '../audit/audit.service';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

const WRITE_ROLES = requireRoles('DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN', 'NURSE', 'PATIENT');

const grantConsentSchema = z.object({
  type: z.enum(['treatment', 'data_sharing', 'ai_analysis', 'research', 'marketing']),
  expiresAt: z.string().optional(),
  signatureData: z.string(), // base64 string
});

// GET /consent/templates
router.get('/templates', (_req, res) => {
  res.json({ status: 'success', data: CONSENT_TEMPLATES });
});

// POST /patients/:id/consent
router.post(
  '/patients/:id/consent',
  WRITE_ROLES,
  validateRequest({ body: grantConsentSchema }),
  async (req: Request, res: Response) => {
    const { id: patientId } = req.params;
    const clinicId = req.user!.clinicId;
    const { type, expiresAt, signatureData } = req.body as { type: ConsentType; expiresAt?: string; signatureData: string };

    const template = CONSENT_TEMPLATES[type];
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const signedAt = new Date();

    // Generate SHA-256 hash: content + patientId + timestamp
    const dataToHash = `${template.text}${patientId}${signedAt.toISOString()}`;
    const signatureHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    const consent = await ConsentModel.findOneAndUpdate(
      { patientId, clinicId, type },
      {
        status: 'granted',
        grantedAt: new Date(),
        withdrawnAt: undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        version: template.version,
        ipAddress,
        userAgent,
        signatureData,
        signedAt,
        signatureHash,
        grantedBy: req.user!.userId,
      },
      { upsert: true, new: true }
    );

    await auditLog(
      {
        action: 'PATIENT_UPDATE',
        resourceType: 'Consent',
        resourceId: String(consent._id),
        userId: req.user!.userId,
        clinicId,
        metadata: { event: 'consent_signed', type, patientId, signatureHash },
      },
      req
    );

    res.status(201).json({ status: 'success', data: consent });
  }
);

// POST /consent/:id/verify
router.post('/consent/:id/verify', async (req: Request, res: Response) => {
  const { id: consentId } = req.params;
  const clinicId = req.user!.clinicId;

  const consent = await ConsentModel.findById(consentId);

  if (!consent || consent.clinicId.toString() !== clinicId) {
    return res.status(404).json({ error: 'NotFound', message: 'Consent record not found' });
  }

  const template = CONSENT_TEMPLATES[consent.type];
  const dataToHash = `${template.text}${consent.patientId}${consent.signedAt!.toISOString()}`;
  const computedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

  const isValid = computedHash === consent.signatureHash;

  await auditLog(
    {
      action: 'VIEW',
      resourceType: 'Consent',
      resourceId: String(consent._id),
      userId: req.user!.userId,
      clinicId,
      metadata: { event: 'consent_verified', isValid, patientId: consent.patientId },
    },
    req
  );

  res.json({ status: 'success', data: { isValid } });
});

// GET /patients/:id/consent
router.get('/patients/:id/consent', async (req: Request, res: Response) => {
  const { id: patientId } = req.params;
  const clinicId = req.user!.clinicId;

  const consents = await ConsentModel.find({ patientId, clinicId }).lean();
  res.json({ status: 'success', data: consents });
});

// DELETE /patients/:id/consent/:type — withdraw consent
router.delete(
  '/patients/:id/consent/:type',
  WRITE_ROLES,
  async (req: Request, res: Response) => {
    const { id: patientId, type } = req.params;
    const clinicId = req.user!.clinicId;

    const consent = await ConsentModel.findOneAndUpdate(
      { patientId, clinicId, type },
      { status: 'withdrawn', withdrawnAt: new Date() },
      { new: true }
    );

    if (!consent) {
      return res.status(404).json({ error: 'NotFound', message: 'Consent record not found' });
    }

    await auditLog(
      {
        action: 'PATIENT_UPDATE',
        resourceType: 'Consent',
        resourceId: String(consent._id),
        userId: req.user!.userId,
        clinicId,
        metadata: { event: 'consent_withdrawn', type, patientId },
      },
      req
    );

    res.json({ status: 'success', data: consent });
  }
);

export const consentRoutes = router;

/**
 * Check if a patient has active consent for a given type.
 * Returns true if consent is granted and not expired.
 */
export async function hasConsent(
  patientId: string,
  clinicId: string,
  type: ConsentType
): Promise<boolean> {
  const consent = await ConsentModel.findOne({ patientId, clinicId, type }).lean();
  if (!consent || consent.status !== 'granted') return false;
  if (consent.expiresAt && consent.expiresAt < new Date()) return false;
  return true;
}
