import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`[${req.requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
};
