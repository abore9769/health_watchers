import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { EncounterTemplateModel } from './encounter-template.model';
import { authenticate, requireRoles } from '@api/middlewares/auth.middleware';
import { validateRequest } from '@api/middlewares/validate.middleware';
import { asyncHandler } from '@api/utils/asyncHandler';
import { templateMarketplaceService } from './template-marketplace.service';

const WRITE_ROLES = requireRoles('DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN');
const ADMIN_ROLES = requireRoles('SUPER_ADMIN');

const templateBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.string().min(1).max(100),
  defaultChiefComplaint: z.string().max(500).optional(),
  defaultVitalSigns: z.record(z.unknown()).optional(),
  suggestedDiagnoses: z.array(z.object({ code: z.string(), description: z.string() })).optional(),
  suggestedTests: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

const router = Router();
router.use(authenticate);

// GET /encounter-templates
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const templates = await EncounterTemplateModel.find({
      clinicId: req.user!.clinicId,
      isActive: true,
    }).sort({ usageCount: -1, name: 1 });
    return res.json({ status: 'success', data: templates });
  })
);

// GET /encounter-templates/:id
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const template = await EncounterTemplateModel.findOne({
      _id: req.params.id,
      clinicId: req.user!.clinicId,
      isActive: true,
    });
    if (!template)
      return res.status(404).json({ error: 'NotFound', message: 'Template not found' });
    return res.json({ status: 'success', data: template });
  })
);

// POST /encounter-templates
router.post(
  '/',
  WRITE_ROLES,
  validateRequest({ body: templateBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const template = await EncounterTemplateModel.create({
      ...req.body,
      clinicId: req.user!.clinicId,
      createdBy: req.user!.userId,
    });
    return res.status(201).json({ status: 'success', data: template });
  })
);

// PUT /encounter-templates/:id
router.put(
  '/:id',
  WRITE_ROLES,
  validateRequest({ body: templateBodySchema.partial() }),
  asyncHandler(async (req: Request, res: Response) => {
    const template = await EncounterTemplateModel.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.user!.clinicId, isActive: true },
      req.body,
      { new: true, runValidators: true }
    );
    if (!template)
      return res.status(404).json({ error: 'NotFound', message: 'Template not found' });
    return res.json({ status: 'success', data: template });
  })
);

// DELETE /encounter-templates/:id — soft delete
router.delete(
  '/:id',
  WRITE_ROLES,
  asyncHandler(async (req: Request, res: Response) => {
    const template = await EncounterTemplateModel.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.user!.clinicId, isActive: true },
      { isActive: false },
      { new: true }
    );
    if (!template)
      return res.status(404).json({ error: 'NotFound', message: 'Template not found' });
    return res.json({ status: 'success', data: { id: String(template._id), isActive: false } });
  })
);

// ── Marketplace endpoints ─────────────────────────────────────────────────────

// POST /encounter-templates/:id/publish — Publish template to marketplace
router.post(
  '/:id/publish',
  WRITE_ROLES,
  asyncHandler(async (req: Request, res: Response) => {
    const template = await EncounterTemplateModel.findOne({
      _id: req.params.id,
      clinicId: req.user!.clinicId,
    });
    if (!template)
      return res.status(404).json({ error: 'NotFound', message: 'Template not found' });

    const published = await templateMarketplaceService.publishTemplate(
      req.params.id,
      req.user!.userId
    );
    return res.json({ status: 'success', data: published });
  })
);

// POST /encounter-templates/:id/import — Import template to clinic
router.post(
  '/:id/import',
  WRITE_ROLES,
  asyncHandler(async (req: Request, res: Response) => {
    const imported = await templateMarketplaceService.importTemplate({
      templateId: req.params.id,
      clinicId: req.user!.clinicId.toString(),
      userId: req.user!.userId,
    });
    return res.status(201).json({ status: 'success', data: imported });
  })
);

// POST /encounter-templates/:id/rate — Rate a template
router.post(
  '/:id/rate',
  WRITE_ROLES,
  validateRequest({ body: z.object({ rating: z.number().min(1).max(5) }) }),
  asyncHandler(async (req: Request, res: Response) => {
    const rated = await templateMarketplaceService.rateTemplate(req.params.id, req.body.rating);
    return res.json({ status: 'success', data: rated });
  })
);

// GET /encounter-templates/marketplace/browse — Browse marketplace
router.get(
  '/marketplace/browse',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const tags = (req.query.tags as string)?.split(',').filter(Boolean);

    const { templates, total } = await templateMarketplaceService.browseMarketplace(
      limit,
      offset,
      tags
    );
    return res.json({ status: 'success', data: templates, pagination: { limit, offset, total } });
  })
);

// GET /encounter-templates/marketplace/search — Search marketplace
router.get(
  '/marketplace/search',
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    if (!query)
      return res.status(400).json({ error: 'BadRequest', message: 'Search query required' });

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const tags = (req.query.tags as string)?.split(',').filter(Boolean);

    const { templates, total } = await templateMarketplaceService.searchMarketplace(
      query,
      tags,
      limit,
      offset
    );
    return res.json({ status: 'success', data: templates, pagination: { limit, offset, total } });
  })
);

// ── Admin endpoints ───────────────────────────────────────────────────────────

// POST /encounter-templates/:id/approve — Approve template for marketplace
router.post(
  '/:id/approve',
  ADMIN_ROLES,
  asyncHandler(async (req: Request, res: Response) => {
    const approved = await templateMarketplaceService.approveTemplate(
      req.params.id,
      req.user!.userId
    );
    return res.json({ status: 'success', data: approved });
  })
);

// POST /encounter-templates/:id/reject — Reject template
router.post(
  '/:id/reject',
  ADMIN_ROLES,
  asyncHandler(async (req: Request, res: Response) => {
    const rejected = await templateMarketplaceService.rejectTemplate(req.params.id);
    return res.json({ status: 'success', data: rejected });
  })
);

// POST /encounter-templates/:id/remove — Remove template from marketplace
router.post(
  '/:id/remove',
  ADMIN_ROLES,
  asyncHandler(async (req: Request, res: Response) => {
    const removed = await templateMarketplaceService.removeTemplate(req.params.id);
    return res.json({ status: 'success', data: removed });
  })
);

export const encounterTemplateRoutes = router;
