import express from 'express';
import { getDashboardKPIs, getAuditLogs } from './reports.controller.js';
import { authenticateToken, tenantScope } from '../../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(tenantScope);

router.get('/dashboard', getDashboardKPIs);
router.get('/audit-logs', getAuditLogs);

export default router;
