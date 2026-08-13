import { AIOrchestrator } from './ai.orchestrator.js';
import { Customer } from '../customers/customer.model.js';
import { Payment } from '../payments/payment.model.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { AppError } from '../../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

export const handleAiChat = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { query } = req.body;

    if (!query) {
      throw new AppError('Voice/text query is required.', 400, 'VALIDATION_ERROR');
    }

    const userId = req.user ? req.user.userId : null;
    const result = await AIOrchestrator.processUserQuery(tenantId, query, userId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const confirmAiAction = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { actionPayload, confirmed } = req.body;

    if (!confirmed || !actionPayload) {
      throw new AppError('Action was not confirmed or payload missing.', 400, 'ACTION_CANCELLED');
    }

    if (actionPayload.actionType === 'RECORD_PAYMENT') {
      const { customerId, amount, method = 'CASH' } = actionPayload;

      const customer = await Customer.findOne({ _id: customerId, tenantId });
      if (!customer) {
        throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
      }

      const amountPaisa = Math.round(parseFloat(amount) * 100);
      const providerTransactionId = `AI-CASH-${uuidv4().substring(0, 8).toUpperCase()}`;

      const payment = new Payment({
        tenantId,
        customerId,
        amount: amountPaisa,
        currency: 'PKR',
        method,
        provider: 'AI_ASSISTANT',
        providerTransactionId,
        status: 'SUCCESS',
        initiatedAt: new Date(),
        confirmedAt: new Date(),
        metadata: { recordedVia: 'AI_ASSISTANT_VOICE_CHAT' },
        createdBy: req.user ? req.user.userId : null
      });

      await payment.save();

      // Post CREDIT to Ledger
      await LedgerService.recordEvent({
        tenantId,
        customerId,
        type: 'PAYMENT',
        direction: 'CREDIT',
        amount: amountPaisa,
        referenceType: 'PAYMENT',
        referenceId: payment._id.toString(),
        description: `Payment recorded via AI Voice/Chat Assistant`,
        createdBy: req.user ? req.user.userId : null
      });

      const updatedCustomer = await Customer.findById(customerId);

      return res.status(200).json({
        success: true,
        data: {
          reply: `Payment of Rs. ${amount.toLocaleString()} for ${customer.name} has been successfully recorded!\nRemaining Balance: Rs. ${(updatedCustomer.currentBalance / 100).toFixed(2)}`,
          payment,
          customer: {
            id: updatedCustomer._id,
            name: updatedCustomer.name,
            currentBalancePKR: (updatedCustomer.currentBalance / 100).toFixed(2)
          }
        }
      });
    }

    throw new AppError('Unsupported AI action type.', 400, 'UNSUPPORTED_ACTION');
  } catch (error) {
    next(error);
  }
};
