import mongoose from 'mongoose';

const paymentRequestSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    amount: { type: Number, required: true }, // in Paisa
    reference: { type: String, required: true, unique: true, index: true },
    provider: { type: String, default: 'RAAST' },
    status: {
      type: String,
      enum: ['CREATED', 'SENT', 'OPENED', 'PAID', 'EXPIRED', 'CANCELLED'],
      default: 'CREATED'
    },
    expiresAt: { type: Date, required: true },
    paymentUrl: { type: String },
    qrPayload: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

paymentRequestSchema.index({ tenantId: 1, reference: 1 }, { unique: true });

export const PaymentRequest = mongoose.model('PaymentRequest', paymentRequestSchema);
