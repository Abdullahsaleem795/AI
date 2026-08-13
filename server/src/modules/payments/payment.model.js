import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    amount: { type: Number, required: true }, // in Paisa
    currency: { type: String, default: 'PKR' },
    method: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'RAAST_QR', 'CARD', 'ONLINE'],
      default: 'CASH'
    },
    provider: { type: String, default: 'MANUAL' },
    providerTransactionId: { type: String, index: true },
    reference: { type: String, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'REVERSED'],
      default: 'SUCCESS'
    },
    initiatedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

paymentSchema.index({ tenantId: 1, providerTransactionId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ tenantId: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
