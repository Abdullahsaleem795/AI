import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

export const generateTokens = (user) => {
  const payload = {
    userId: user._id.toString(),
    tenantId: user.tenantId.toString(),
    roles: user.roles,
    permissions: user.permissions || []
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });

  return { accessToken, refreshToken };
};

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication token required.', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    req.tenantId = decoded.tenantId;
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired authentication token.', 401, 'INVALID_TOKEN'));
  }
};

export const tenantScope = (req, res, next) => {
  if (!req.tenantId) {
    return next(new AppError('Tenant scope missing from request.', 403, 'TENANT_SCOPE_REQUIRED'));
  }
  next();
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return next(new AppError('User roles not found.', 403, 'FORBIDDEN'));
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return next(new AppError('Insufficient permissions for this operation.', 403, 'PERMISSION_DENIED'));
    }

    next();
  };
};
