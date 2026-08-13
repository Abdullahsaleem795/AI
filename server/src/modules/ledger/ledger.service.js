import { LedgerEntry } from './ledger.model.js';
import { Customer } from '../customers/customer.model.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * Ledger Service - Enforces financial auditability and balance calculation
 */
export class LedgerService {
  /**
   * Posts an immutable financial event to the ledger and updates customer balance safely
   */
  static async recordEvent({
    tenantId,
    customerId,
    type,
    direction,
    amount, // in Paisa
    referenceType = 'SYSTEM',
    referenceId = null,
    description,
    createdBy = null,
    metadata = {}
  }) {
    if (!tenantId || !customerId || !type || !direction || amount === undefined) {
      throw new AppError('Invalid parameters for recording ledger event.', 400, 'LEDGER_INVALID_PARAMS');
    }

    if (amount < 0) {
      throw new AppError('Ledger entry amount must be non-negative.', 400, 'INVALID_AMOUNT');
    }

    const customer = await Customer.findOne({ _id: customerId, tenantId });
    if (!customer) {
      throw new AppError('Customer not found for ledger posting.', 404, 'CUSTOMER_NOT_FOUND');
    }

    // Calculate new running balance: DEBIT increases debt (+), CREDIT decreases debt (-)
    const currentBal = customer.currentBalance || 0;
    const delta = direction === 'DEBIT' ? amount : -amount;
    const balanceAfter = currentBal + delta;

    const entry = new LedgerEntry({
      tenantId,
      customerId,
      type,
      direction,
      amount,
      balanceAfter,
      referenceType,
      referenceId,
      description,
      createdBy,
      metadata
    });

    await entry.save();

    // Update customer current balance
    customer.currentBalance = balanceAfter;
    await customer.save();

    return entry;
  }

  /**
   * Generates a customer financial statement between dates
   */
  static async getStatement(tenantId, customerId, startDate = null, endDate = null) {
    const customer = await Customer.findOne({ _id: customerId, tenantId });
    if (!customer) {
      throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    }

    const query = { tenantId, customerId };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const entries = await LedgerEntry.find(query).sort({ createdAt: 1 }).populate('createdBy', 'name');

    // Calculate total debit and credit in range
    let totalDebits = 0;
    let totalCredits = 0;

    entries.forEach((e) => {
      if (e.direction === 'DEBIT') totalDebits += e.amount;
      if (e.direction === 'CREDIT') totalCredits += e.amount;
    });

    return {
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        currentBalance: customer.currentBalance, // in Paisa
        currentBalancePKR: (customer.currentBalance / 100).toFixed(2)
      },
      summary: {
        totalDebitsPaisa: totalDebits,
        totalDebitsPKR: (totalDebits / 100).toFixed(2),
        totalCreditsPaisa: totalCredits,
        totalCreditsPKR: (totalCredits / 100).toFixed(2),
        closingBalancePaisa: customer.currentBalance,
        closingBalancePKR: (customer.currentBalance / 100).toFixed(2)
      },
      entries: entries.map((e) => ({
        id: e._id,
        type: e.type,
        direction: e.direction,
        amountPaisa: e.amount,
        amountPKR: (e.amount / 100).toFixed(2),
        balanceAfterPaisa: e.balanceAfter,
        balanceAfterPKR: (e.balanceAfter / 100).toFixed(2),
        description: e.description,
        referenceType: e.referenceType,
        referenceId: e.referenceId,
        createdBy: e.createdBy ? e.createdBy.name : 'System',
        createdAt: e.createdAt
      }))
    };
  }
}
