import jwt from 'jsonwebtoken';
import { Tenant } from '../tenants/tenant.model.js';
import { User } from '../users/user.model.js';
import { generateTokens } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { env } from '../../config/env.js';

export const registerTenant = async (req, res, next) => {
  try {
    const { shopName, ownerName, phone, email, password, address, businessType } = req.body;

    if (!shopName || !ownerName || !phone || !password) {
      throw new AppError('Shop name, owner name, phone, and password are required.', 400, 'VALIDATION_ERROR');
    }

    // Check if phone or email already exists for a user
    const existingUser = await User.findOne({ $or: [{ phone }, ...(email ? [{ email }] : [])] });
    if (existingUser) {
      throw new AppError('User with this phone or email already exists.', 400, 'DUPLICATE_USER');
    }

    // Create Tenant first
    const tenant = new Tenant({
      name: shopName,
      phone,
      email,
      address,
      businessType: businessType || 'RETAIL_SHOP'
    });
    await tenant.save();

    // Create Owner User
    const passwordHash = await User.hashPassword(password);
    const owner = new User({
      tenantId: tenant._id,
      name: ownerName,
      phone,
      email,
      passwordHash,
      roles: ['OWNER'],
      status: 'ACTIVE'
    });
    await owner.save();

    // Update Tenant owner reference
    tenant.ownerId = owner._id;
    await tenant.save();

    const tokens = generateTokens(owner);

    res.status(201).json({
      success: true,
      data: {
        tenant: {
          id: tenant._id,
          name: tenant.name,
          currency: tenant.currency
        },
        user: {
          id: owner._id,
          name: owner.name,
          phone: owner.phone,
          roles: owner.roles
        },
        tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { phone, email, password } = req.body;

    if ((!phone && !email) || !password) {
      throw new AppError('Phone/email and password are required.', 400, 'VALIDATION_ERROR');
    }

    const query = phone ? { phone } : { email: email.toLowerCase() };
    const user = await User.findOne(query);

    if (!user) {
      throw new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('User account is suspended or inactive.', 403, 'ACCOUNT_INACTIVE');
    }

    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new AppError('Shop account is suspended or inactive.', 403, 'TENANT_INACTIVE');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = generateTokens(user);

    res.status(200).json({
      success: true,
      data: {
        tenant: {
          id: tenant._id,
          name: tenant.name,
          currency: tenant.currency,
          settings: tenant.settings
        },
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          roles: user.roles,
          permissions: user.permissions
        },
        tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      throw new AppError('Refresh token required.', 400, 'VALIDATION_ERROR');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch (e) {
      throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_TOKEN');
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('User account not found or inactive.', 401, 'UNAUTHORIZED');
    }

    const tokens = generateTokens(user);

    res.status(200).json({
      success: true,
      data: { tokens }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      throw new AppError('User profile not found.', 404, 'NOT_FOUND');
    }

    const tenant = await Tenant.findById(user.tenantId);

    res.status(200).json({
      success: true,
      data: {
        user,
        tenant
      }
    });
  } catch (error) {
    next(error);
  }
};
