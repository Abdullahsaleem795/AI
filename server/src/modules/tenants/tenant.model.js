import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    currency: { type: String, default: 'PKR' },
    timezone: { type: String, default: 'Asia/Karachi' },
    businessType: { type: String, default: 'RETAIL_SHOP' },
    settings: {
      autoReconcileThreshold: { type: Number, default: 80 }, // Confidence % threshold
      currencySymbol: { type: String, default: 'Rs.' },
      allowCashierCreditSale: { type: Boolean, default: true },
      reminderScheduleDays: { type: [Number], default: [7, 14, 30] }
    },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' }
  },
  { timestamps: true }
);

export const Tenant = mongoose.model('Tenant', tenantSchema);
