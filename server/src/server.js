import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import logger from './utils/logger.js';

const startServer = async () => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    logger.info(`🔗 API Base URL: http://localhost:${env.PORT}/api`);
  });

  const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      logger.info('Closed out remaining connections.');
      await disconnectDB();
      import('./config/redis.js').then(({ redisClient }) => {
        if (redisClient && redisClient.quit) redisClient.quit();
      });
      process.exit(0);
    });

    // If after 10s server hasn't finished, force shutdown
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
});
