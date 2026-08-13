import express from 'express';
import { createCustomer, getCustomers, getCustomerById, getCustomerLedger } from './customer.controller.js';
import { authenticateToken, tenantScope } from '../../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(tenantScope);

router.post('/', createCustomer);
router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.get('/:id/ledger', getCustomerLedger);

export default router;
