import mongoose from 'mongoose';

const ledgerEntrySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    type: {
      type: String,
      enum: ['SALE', 'PAYMENT', 'REFUND', 'ADJUSTMENT', 'OPENING_BALANCE', 'REVERSAL'],
      required: true
    },
    direction: {
      type: String,
      enum: ['DEBIT', 'CREDIT'], // DEBIT increases customer debt, CREDIT decreases customer debt
      required: true
    },
    amount: { type: Number, required: true }, // in Paisa (1 PKR = 100 Paisa)
    currency: { type: String, default: 'PKR' },
    balanceAfter: { type: Number, required: true }, // Running balance after this transaction in Paisa
    referenceType: { type: String, enum: ['SALE', 'PAYMENT', 'ADJUSTMENT', 'SYSTEM'], default: 'SYSTEM' },
    referenceId: { type: String },
    description: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

ledgerEntrySchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });

export const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);
