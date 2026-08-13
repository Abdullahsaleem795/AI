import { v4 as uuidv4 } from 'uuid';
import { Customer } from './customer.model.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { normalizePhone } from '../../utils/phone.js';
import { AppError } from '../../middleware/errorHandler.js';

export const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, alternatePhone, address, email, creditLimit, openingBalance, tags, notes } = req.body;
    const tenantId = req.tenantId;

    if (!name || !phone) {
      throw new AppError('Customer name and phone number are required.', 400, 'VALIDATION_ERROR');
    }

    const normalizedPhone = normalizePhone(phone);

    // Check if phone already registered for this tenant
    const existing = await Customer.findOne({ tenantId, phone: normalizedPhone });
    if (existing) {
      throw new AppError('A customer with this phone number already exists.', 400, 'DUPLICATE_CUSTOMER');
    }

    // Generate tenant customer count for code (e.g. CUST-0001)
    const count = await Customer.countDocuments({ tenantId });
    const customerCode = `CUST-${(count + 1).toString().padStart(4, '0')}`;
    const qrIdentifier = `KHT-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Opening balance in Paisa (1 PKR = 100 Paisa)
    const openingBalPaisa = Math.round((openingBalance || 0) * 100);
    const creditLimitPaisa = Math.round((creditLimit || 100000) * 100);

    const customer = new Customer({
      tenantId,
      customerCode,
      name,
      phone: normalizedPhone,
      alternatePhone: alternatePhone ? normalizePhone(alternatePhone) : undefined,
      email,
      address,
      creditLimit: creditLimitPaisa,
      openingBalance: openingBalPaisa,
      currentBalance: 0, // will be set by ledger post if opening balance > 0
      qrIdentifier,
      tags: tags || [],
      notes
    });

    await customer.save();

    // If opening balance > 0, post OPENING_BALANCE DEBIT to Ledger
    if (openingBalPaisa > 0) {
      await LedgerService.recordEvent({
        tenantId,
        customerId: customer._id,
        type: 'OPENING_BALANCE',
        direction: 'DEBIT',
        amount: openingBalPaisa,
        description: `Opening credit balance recorded for ${customer.name}`,
        createdBy: req.user ? req.user.userId : null
      });
    }

    const updatedCustomer = await Customer.findById(customer._id);

    res.status(201).json({
      success: true,
      data: {
        customer: {
          ...updatedCustomer.toObject(),
          openingBalancePKR: (updatedCustomer.openingBalance / 100).toFixed(2),
          currentBalancePKR: (updatedCustomer.currentBalance / 100).toFixed(2),
          creditLimitPKR: (updatedCustomer.creditLimit / 100).toFixed(2)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomers = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { search, page = 1, limit = 20, status = 'ACTIVE' } = req.query;

    const query = { tenantId, status };

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { customerCode: searchRegex }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Customer.countDocuments(query);

    const customers = await Customer.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        customers: customers.map((c) => ({
          ...c.toObject(),
          currentBalancePKR: (c.currentBalance / 100).toFixed(2),
          creditLimitPKR: (c.creditLimit / 100).toFixed(2)
        })),
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const customer = await Customer.findOne({ _id: id, tenantId });
    if (!customer) {
      throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: {
        customer: {
          ...customer.toObject(),
          currentBalancePKR: (customer.currentBalance / 100).toFixed(2),
          creditLimitPKR: (customer.creditLimit / 100).toFixed(2)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerLedger = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const tenantId = req.tenantId;

    const statement = await LedgerService.getStatement(tenantId, id, startDate, endDate);

    res.status(200).json({
      success: true,
      data: statement
    });
  } catch (error) {
    next(error);
  }
};
