import express from 'express';
import { handlePaymentWebhook } from './webhooks.controller.js';

const router = express.Router();

router.post('/:provider', handlePaymentWebhook);

export default router;
