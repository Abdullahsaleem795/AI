import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import logger from './utils/logger.js';

const startServer = async () => {
  await connectDB();

  app.listen(env.PORT, () => {
    logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    logger.info(`🔗 API Base URL: http://localhost:${env.PORT}/api`);
  });
};

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
});
