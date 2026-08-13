import mongoose from 'mongoose';

const reconciliationRecordSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    matchedSaleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    confidenceScore: { type: Number, required: true }, // 0 - 100
    matchSignal: {
      type: String,
      enum: ['EXACT_REF', 'PROVIDER_TX', 'CUSTOMER_PHONE', 'AMOUNT_MATCH', 'MANUAL_SELECTION'],
      required: true
    },
    status: {
      type: String,
      enum: ['AUTO_RECONCILED', 'MANUALLY_RECONCILED', 'REVIEW_REQUIRED', 'UNMATCHED', 'REJECTED'],
      required: true,
      index: true
    },
    matchCandidates: [
      {
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
        score: { type: Number },
        reason: { type: String }
      }
    ],
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

reconciliationRecordSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export const ReconciliationRecord = mongoose.model('ReconciliationRecord', reconciliationRecordSchema);
