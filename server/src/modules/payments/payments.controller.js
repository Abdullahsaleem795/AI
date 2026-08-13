import { Payment } from './payment.model.js';
import { PaymentRequest } from './paymentRequest.model.js';
import { Customer } from '../customers/customer.model.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { RaastAdapter } from '../../integrations/payments/RaastAdapter.js';
import { AppError } from '../../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

const raastAdapter = new RaastAdapter();

export const recordManualPayment = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { customerId, amount, method = 'CASH', saleId, notes } = req.body;

    if (!customerId || !amount || parseFloat(amount) <= 0) {
      throw new AppError('Customer ID and positive amount are required.', 400, 'VALIDATION_ERROR');
    }

    const customer = await Customer.findOne({ _id: customerId, tenantId });
    if (!customer) {
      throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    }

    const amountPaisa = Math.round(parseFloat(amount) * 100);
    const providerTransactionId = `CASH-${uuidv4().substring(0, 8).toUpperCase()}`;

    const payment = new Payment({
      tenantId,
      customerId,
      saleId,
      amount: amountPaisa,
      currency: 'PKR',
      method,
      provider: 'MANUAL',
      providerTransactionId,
      status: 'SUCCESS',
      initiatedAt: new Date(),
      confirmedAt: new Date(),
      metadata: { notes },
      createdBy: req.user ? req.user.userId : null
    });

    await payment.save();

    if (saleId) {
      await PaymentRequest.updateMany(
        { tenantId, saleId, status: { $in: ['CREATED', 'SENT', 'OPENED'] } },
        { $set: { status: 'PAID' } }
      );
    }

    // Post CREDIT to Ledger
    await LedgerService.recordEvent({
      tenantId,
      customerId,
      type: 'PAYMENT',
      direction: 'CREDIT',
      amount: amountPaisa,
      referenceType: 'PAYMENT',
      referenceId: payment._id.toString(),
      description: `Manual ${method} payment recorded`,
      createdBy: req.user ? req.user.userId : null
    });

    const updatedCustomer = await Customer.findById(customerId);

    res.status(201).json({
      success: true,
      data: {
        payment: {
          ...payment.toObject(),
          amountPKR: (payment.amount / 100).toFixed(2)
        },
        customer: {
          id: updatedCustomer._id,
          name: updatedCustomer.name,
          currentBalancePKR: (updatedCustomer.currentBalance / 100).toFixed(2)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createPaymentRequest = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { customerId, amount, saleId, expiryHours = 24 } = req.body;

    if (!customerId || !amount || parseFloat(amount) <= 0) {
      throw new AppError('Customer ID and positive payment amount are required.', 400, 'VALIDATION_ERROR');
    }

    const customer = await Customer.findOne({ _id: customerId, tenantId });
    if (!customer) {
      throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    }

    const amountPaisa = Math.round(parseFloat(amount) * 100);
    const reference = `REQ-${uuidv4().substring(0, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + expiryHours * 3600 * 1000);

    const raastData = await raastAdapter.createPaymentRequest({
      tenantId,
      customer,
      amountPaisa,
      reference,
      expiresAt
    });

    const pRequest = new PaymentRequest({
      tenantId,
      customerId,
      saleId,
      amount: amountPaisa,
      reference,
      provider: 'RAAST',
      status: 'SENT',
      expiresAt,
      paymentUrl: raastData.paymentUrl,
      qrPayload: raastData.qrPayload,
      createdBy: req.user ? req.user.userId : null
    });

    await pRequest.save();

    res.status(201).json({
      success: true,
      data: {
        paymentRequest: {
          ...pRequest.toObject(),
          amountPKR: (pRequest.amount / 100).toFixed(2)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { customerId, page = 1, limit = 20, status } = req.query;

    const query = { tenantId };
    if (customerId) query.customerId = customerId;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Payment.countDocuments(query);

    const payments = await Payment.find(query)
      .populate('customerId', 'name phone customerCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        payments: payments.map((p) => ({
          ...p.toObject(),
          amountPKR: (p.amount / 100).toFixed(2)
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

export const reversePayment = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { reason } = req.body;

    const hasPermission = req.user.roles && req.user.roles.some(r => ['OWNER', 'MANAGER', 'ADMIN'].includes(r));
    if (!hasPermission) {
      throw new AppError('Unauthorized to reverse payments.', 403, 'FORBIDDEN');
    }

    if (!reason) {
      throw new AppError('Reversal reason is required.', 400, 'VALIDATION_ERROR');
    }

    const payment = await Payment.findOne({ _id: id, tenantId });
    if (!payment) {
      throw new AppError('Payment not found.', 404, 'NOT_FOUND');
    }

    if (payment.status !== 'SUCCESS') {
      throw new AppError('Only SUCCESS payments can be reversed.', 400, 'INVALID_STATE');
    }

    payment.status = 'REVERSED';
    payment.metadata = { ...payment.metadata, reversalReason: reason, reversedAt: new Date(), reversedBy: req.user.userId };
    await payment.save();

    if (payment.customerId) {
      await LedgerService.recordEvent({
        tenantId,
        customerId: payment.customerId,
        type: 'REVERSAL',
        direction: 'DEBIT', // Reverse the credit
        amount: payment.amount,
        referenceType: 'PAYMENT',
        referenceId: payment._id.toString(),
        description: `Payment reversal: ${reason}`,
        createdBy: req.user.userId
      });
    }

    res.status(200).json({ success: true, data: { payment } });
  } catch (error) {
    next(error);
  }
};
