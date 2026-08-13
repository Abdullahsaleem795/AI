import express from 'express';
import { createSale, getSales, getSaleById } from './sales.controller.js';
import { authenticateToken, tenantScope } from '../../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(tenantScope);

router.post('/', createSale);
router.get('/', getSales);
router.get('/:id', getSaleById);

export default router;
