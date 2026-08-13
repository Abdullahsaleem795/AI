import { ReconciliationRecord } from './reconciliation.model.js';
import { Payment } from '../payments/payment.model.js';
import { PaymentRequest } from '../payments/paymentRequest.model.js';
import { Customer } from '../customers/customer.model.js';
import { Sale } from '../sales/sale.model.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { normalizePhone } from '../../utils/phone.js';
import logger from '../../utils/logger.js';

export class ReconciliationEngine {
  /**
   * Main entry point for processing incoming payments via webhooks or manual bank import
   */
  static async processIncomingPayment(tenantId, paymentPayload) {
    const {
      providerTransactionId,
      merchantReference,
      amountPaisa,
      customerPhone,
      customerAccount,
      method = 'RAAST_QR',
      provider = 'RAAST',
      metadata = {}
    } = paymentPayload;

    // Rule 7 — Idempotency Check: Prevent duplicate payment processing
    if (providerTransactionId) {
      const existingPayment = await Payment.findOne({ tenantId, providerTransactionId });
      if (existingPayment) {
        logger.info(`Idempotent webhook trigger: Payment ${providerTransactionId} already processed.`);
        const existingRecord = await ReconciliationRecord.findOne({ tenantId, paymentId: existingPayment._id });
        return { payment: existingPayment, reconciliation: existingRecord, duplicate: true };
      }
    }

    // Create preliminary Payment record
    const payment = new Payment({
      tenantId,
      amount: amountPaisa,
      currency: 'PKR',
      method,
      provider,
      providerTransactionId: providerTransactionId || `TX-${Date.now()}`,
      reference: merchantReference,
      status: paymentPayload.status === 'SUCCESS' ? 'PROCESSING' : paymentPayload.status || 'FAILED',
      metadata
    });
    await payment.save();

    if (payment.status !== 'PROCESSING') {
      logger.warn(`Skipping reconciliation for non-successful payment: ${payment.providerTransactionId}`);
      return { payment, reconciliation: { status: 'SKIPPED_DUE_TO_FAILURE' } };
    }

    // Signal Match 1: Exact Merchant Reference match with PaymentRequest
    if (merchantReference) {
      const pRequest = await PaymentRequest.findOne({ tenantId, reference: merchantReference });
      if (pRequest) {
        const customer = await Customer.findOne({ _id: pRequest.customerId, tenantId });
        if (customer) {
          pRequest.status = 'PAID';
          await pRequest.save();

          payment.customerId = customer._id;
          payment.saleId = pRequest.saleId;
          payment.status = 'SUCCESS';
          payment.confirmedAt = new Date();
          await payment.save();

          const recRecord = new ReconciliationRecord({
            tenantId,
            paymentId: payment._id,
            customerId: customer._id,
            matchedSaleId: pRequest.saleId,
            confidenceScore: 100,
            matchSignal: 'EXACT_REF',
            status: 'AUTO_RECONCILED'
          });
          await recRecord.save();

          // Post to Ledger
          await LedgerService.recordEvent({
            tenantId,
            customerId: customer._id,
            type: 'PAYMENT',
            direction: 'CREDIT',
            amount: amountPaisa,
            referenceType: 'PAYMENT',
            referenceId: payment._id.toString(),
            description: `Auto-reconciled Raast digital payment (${merchantReference})`
          });

          // Update Sale if attached
          if (pRequest.saleId) {
            await ReconciliationEngine.updateSalePaymentStatus(tenantId, pRequest.saleId, amountPaisa);
          }

          return { payment, reconciliation: recRecord };
        }
      }
    }

    // Signal Match 2: Phone number match
    let matchedCustomer = null;
    if (customerPhone) {
      const normPhone = normalizePhone(customerPhone);
      matchedCustomer = await Customer.findOne({ tenantId, phone: normPhone });
    }

    if (matchedCustomer) {
      payment.customerId = matchedCustomer._id;
      payment.status = 'SUCCESS';
      payment.confirmedAt = new Date();
      await payment.save();

      const recRecord = new ReconciliationRecord({
        tenantId,
        paymentId: payment._id,
        customerId: matchedCustomer._id,
        confidenceScore: 85,
        matchSignal: 'CUSTOMER_PHONE',
        status: 'AUTO_RECONCILED'
      });
      await recRecord.save();

      await LedgerService.recordEvent({
        tenantId,
        customerId: matchedCustomer._id,
        type: 'PAYMENT',
        direction: 'CREDIT',
        amount: amountPaisa,
        referenceType: 'PAYMENT',
        referenceId: payment._id.toString(),
        description: `Auto-reconciled payment matched by customer phone ${customerPhone}`
      });

      return { payment, reconciliation: recRecord };
    }

    // Signal Match 3: Candidate search by exact amount matching open debt
    const candidates = await Customer.find({
      tenantId,
      currentBalance: amountPaisa,
      status: 'ACTIVE'
    }).limit(5);

    if (candidates.length === 1) {
      // Single candidate exact match -> AUTO_RECONCILED with score 80
      const candidate = candidates[0];
      payment.customerId = candidate._id;
      payment.status = 'SUCCESS';
      payment.confirmedAt = new Date();
      await payment.save();

      const recRecord = new ReconciliationRecord({
        tenantId,
        paymentId: payment._id,
        customerId: candidate._id,
        confidenceScore: 80,
        matchSignal: 'AMOUNT_MATCH',
        status: 'AUTO_RECONCILED'
      });
      await recRecord.save();

      await LedgerService.recordEvent({
        tenantId,
        customerId: candidate._id,
        type: 'PAYMENT',
        direction: 'CREDIT',
        amount: amountPaisa,
        referenceType: 'PAYMENT',
        referenceId: payment._id.toString(),
        description: `Auto-reconciled payment matched by exact outstanding balance (Rs ${(amountPaisa / 100).toFixed(2)})`
      });

      return { payment, reconciliation: recRecord };
    }

    // Signal Match 4: Multiple candidates or ambiguous payment -> REVIEW_REQUIRED
    const matchCandidates = candidates.map((c) => ({
      customerId: c._id,
      score: 65,
      reason: `Outstanding balance matches payment amount (Rs ${(c.currentBalance / 100).toFixed(2)})`
    }));

    payment.status = 'PENDING';
    await payment.save();

    const recRecord = new ReconciliationRecord({
      tenantId,
      paymentId: payment._id,
      confidenceScore: matchCandidates.length > 0 ? 65 : 0,
      matchSignal: 'AMOUNT_MATCH',
      status: matchCandidates.length > 0 ? 'REVIEW_REQUIRED' : 'UNMATCHED',
      matchCandidates
    });
    await recRecord.save();

    return { payment, reconciliation: recRecord };
  }

  /**
   * Manually resolves a flagged or unmatched payment from the Review Queue
   */
  static async resolveManually(tenantId, reconciliationId, customerId, userId) {
    const recRecord = await ReconciliationRecord.findOne({ _id: reconciliationId, tenantId });
    if (!recRecord) {
      throw new Error('Reconciliation record not found.');
    }

    if (recRecord.status === 'AUTO_RECONCILED' || recRecord.status === 'MANUALLY_RECONCILED') {
      throw new Error('Payment has already been reconciled.');
    }

    const customer = await Customer.findOne({ _id: customerId, tenantId });
    if (!customer) {
      throw new Error('Customer not found for manual assignment.');
    }

    const payment = await Payment.findOne({ _id: recRecord.paymentId, tenantId });
    if (!payment) {
      throw new Error('Associated payment not found.');
    }

    payment.customerId = customer._id;
    payment.status = 'SUCCESS';
    payment.confirmedAt = new Date();
    await payment.save();

    recRecord.customerId = customer._id;
    recRecord.status = 'MANUALLY_RECONCILED';
    recRecord.confidenceScore = 100;
    recRecord.resolvedBy = userId;
    recRecord.resolvedAt = new Date();
    await recRecord.save();

    // Post to Ledger
    await LedgerService.recordEvent({
      tenantId,
      customerId: customer._id,
      type: 'PAYMENT',
      direction: 'CREDIT',
      amount: payment.amount,
      referenceType: 'PAYMENT',
      referenceId: payment._id.toString(),
      description: `Manually reconciled payment (Ref: ${payment.providerTransactionId})`,
      createdBy: userId
    });

    return { payment, reconciliation: recRecord };
  }

  static async updateSalePaymentStatus(tenantId, saleId, paymentAmountPaisa) {
    const sale = await Sale.findOne({ _id: saleId, tenantId });
    if (!sale) return;

    sale.amountPaid += paymentAmountPaisa;
    sale.amountDue = Math.max(0, sale.grandTotal - sale.amountPaid);
    if (sale.amountDue === 0) {
      sale.paymentStatus = 'PAID';
    } else {
      sale.paymentStatus = 'PARTIAL';
    }
    await sale.save();
  }
}
