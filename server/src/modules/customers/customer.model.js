import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    customerCode: { type: String, required: true },
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    alternatePhone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    creditLimit: { type: Number, default: 10000000 }, // in Paisa (default 100,000 PKR)
    openingBalance: { type: Number, default: 0 }, // in Paisa (positive = owes money)
    currentBalance: { type: Number, default: 0, index: true }, // in Paisa (positive = owes money)
    qrIdentifier: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    tags: [{ type: String }],
    notes: { type: String }
  },
  { timestamps: true }
);

// Compound index for fast phone search per tenant
customerSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
customerSchema.index({ tenantId: 1, customerCode: 1 }, { unique: true });

export const Customer = mongoose.model('Customer', customerSchema);
