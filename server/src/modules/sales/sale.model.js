import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true }, // in Paisa
  total: { type: Number, required: true } // in Paisa
});

const saleSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    invoiceNumber: { type: String, required: true },
    saleType: { type: String, enum: ['CREDIT', 'CASH'], default: 'CREDIT' },
    items: [saleItemSchema],
    subtotal: { type: Number, required: true }, // in Paisa
    discount: { type: Number, default: 0 }, // in Paisa
    tax: { type: Number, default: 0 }, // in Paisa
    grandTotal: { type: Number, required: true }, // in Paisa
    amountPaid: { type: Number, default: 0 }, // in Paisa
    amountDue: { type: Number, required: true }, // in Paisa
    paymentStatus: { type: String, enum: ['UNPAID', 'PARTIAL', 'PAID'], default: 'UNPAID' },
    saleStatus: { type: String, enum: ['COMPLETED', 'CANCELLED', 'REVERSED'], default: 'COMPLETED' },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

saleSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
saleSchema.index({ tenantId: 1, createdAt: -1 });

export const Sale = mongoose.model('Sale', saleSchema);
