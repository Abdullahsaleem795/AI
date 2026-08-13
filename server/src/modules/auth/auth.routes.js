import express from 'express';
import { registerTenant, login, refreshToken, getMe } from './auth.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

router.post('/register', registerTenant);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', authenticateToken, getMe);

export default router;
