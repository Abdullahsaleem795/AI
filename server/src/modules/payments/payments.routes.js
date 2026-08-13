import express from 'express';
import { recordManualPayment, createPaymentRequest, getPayments } from './payments.controller.js';
import { authenticateToken, tenantScope } from '../../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(tenantScope);

router.post('/', recordManualPayment);
router.post('/request', createPaymentRequest);
router.get('/', getPayments);

export default router;
