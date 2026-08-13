import express from 'express';
import { handleAiChat, confirmAiAction } from './ai.controller.js';
import { authenticateToken, tenantScope } from '../../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(tenantScope);

router.post('/chat', handleAiChat);
router.post('/confirm-action', confirmAiAction);

export default router;
