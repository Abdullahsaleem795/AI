import express from 'express';
import { getCollectionsSummary, getOverdueCustomers, sendReminder } from './collections.controller.js';
import { authenticateToken, tenantScope } from '../../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(tenantScope);

router.get('/summary', getCollectionsSummary);
router.get('/overdue', getOverdueCustomers);
router.post('/remind', sendReminder);

export default router;
