import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const requestId = req.requestId || 'req-' + Date.now();

  logger.error(`[${requestId}] ${req.method} ${req.originalUrl} - ${err.message}`, {
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    details: err.details || null
  });

  const isProd = process.env.NODE_ENV === 'production';
  const message = isProd && statusCode === 500 && !err.isOperational
    ? 'An unexpected server error occurred.'
    : err.message || 'An unexpected server error occurred.';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      details: isProd ? undefined : err.details
    },
    requestId
  });
};

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}
