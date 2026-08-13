import express from 'express';
import { getUnmatchedReconciliations, resolveReconciliation } from './reconciliation.controller.js';
import { authenticateToken, tenantScope } from '../../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(tenantScope);

router.get('/unmatched', getUnmatchedReconciliations);
router.post('/:id/resolve', resolveReconciliation);

export default router;
