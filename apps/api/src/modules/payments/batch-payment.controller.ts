import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRoles } from '../../middleware/requireRoles';
import { validate } from '../../middleware/validate';
import { batchPaymentService } from './batch-payment.service';
import { createBatchPaymentSchema } from './batch-payment.validation';

const router = Router();

// POST /api/v1/payments/batch
router.post(
  '/',
  authenticate,
  requireRoles('CLINIC_ADMIN', 'SUPER_ADMIN'),
  validate(createBatchPaymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const batch = await batchPaymentService.createBatch(req.body, user);

      res.status(201).json({
        status: 'success',
        data: batch,
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/v1/payments/batch/:batchId
router.get(
  '/:batchId',
  authenticate,
  requireRoles('CLINIC_ADMIN', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const batch = await batchPaymentService.getBatch(req.params.batchId, user.clinicId);

      if (!batch) {
        return res.status(404).json({
          status: 'error',
          message: 'Batch not found',
        });
      }

      res.json({
        status: 'success',
        data: batch,
      });
    } catch (error) {
      next(error);
    }
  },
);

export const batchPaymentRouter = router;
