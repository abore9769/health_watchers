import { Router } from 'express';
import { paymentRoutes } from './payments.controller';
import { disputeRoutes } from './dispute.controller';
import { paymentExportRoutes } from './payments.export.controller';
import { claimsRoutes } from './claims.controller';
import { batchPaymentRouter } from './batch-payment.controller';

const router = Router();

router.use('/', paymentExportRoutes);
router.use('/', paymentRoutes);
router.use('/', disputeRoutes);
router.use('/claims', claimsRoutes);
router.use('/batch', batchPaymentRouter);

export default router;
