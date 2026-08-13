import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Route Imports
import authRoutes from './modules/auth/auth.routes.js';
import customerRoutes from './modules/customers/customer.routes.js';
import salesRoutes from './modules/sales/sales.routes.js';
import paymentRoutes from './modules/payments/payments.routes.js';
import reconciliationRoutes from './modules/reconciliation/reconciliation.routes.js';
import webhookRoutes from './modules/webhooks/webhooks.routes.js';
import collectionRoutes from './modules/collections/collections.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';

const app = express();

// Security & Parsing Middlewares
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const allowedOrigins = env.NODE_ENV === 'production' 
  ? [env.CLIENT_URL] 
  : [env.CLIENT_URL, 'http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'HEALTHY',
      service: 'AI Collections & Reconciliation Platform API',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
