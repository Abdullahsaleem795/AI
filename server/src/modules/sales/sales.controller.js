import { Sale } from './sale.model.js';
import { Customer } from '../customers/customer.model.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export const createSale = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { customerId, items, discount = 0, tax = 0, amountPaid = 0, saleType = 'CREDIT', notes } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('Customer ID and at least one item are required.', 400, 'VALIDATION_ERROR');
    }

    const customer = await Customer.findOne({ _id: customerId, tenantId });
    if (!customer) {
      throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    }

    // Recalculate financial totals server-side (in Paisa)
    let computedSubtotal = 0;
    const validatedItems = items.map((item) => {
      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      const unitPricePaisa = Math.round((parseFloat(item.unitPrice) || 0) * 100);
      const totalPaisa = quantity * unitPricePaisa;
      computedSubtotal += totalPaisa;

      return {
        name: item.name.trim(),
        quantity,
        unitPrice: unitPricePaisa,
        total: totalPaisa
      };
    });

    const discountPaisa = Math.round((parseFloat(discount) || 0) * 100);
    const taxPaisa = Math.round((parseFloat(tax) || 0) * 100);
    const grandTotalPaisa = Math.max(0, computedSubtotal - discountPaisa + taxPaisa);
    const amountPaidPaisa = Math.round((parseFloat(amountPaid) || 0) * 100);
    const amountDuePaisa = Math.max(0, grandTotalPaisa - amountPaidPaisa);

    let paymentStatus = 'UNPAID';
    if (amountPaidPaisa >= grandTotalPaisa) {
      paymentStatus = 'PAID';
    } else if (amountPaidPaisa > 0) {
      paymentStatus = 'PARTIAL';
    }

    // Invoice numbering e.g. INV-0001
    const count = await Sale.countDocuments({ tenantId });
    const invoiceNumber = `INV-${(count + 1).toString().padStart(4, '0')}`;

    const sale = new Sale({
      tenantId,
      customerId,
      invoiceNumber,
      saleType,
      items: validatedItems,
      subtotal: computedSubtotal,
      discount: discountPaisa,
      tax: taxPaisa,
      grandTotal: grandTotalPaisa,
      amountPaid: amountPaidPaisa,
      amountDue: amountDuePaisa,
      paymentStatus,
      saleStatus: 'COMPLETED',
      notes,
      createdBy: req.user ? req.user.userId : null
    });

    await sale.save();

    // Post to Ledger:
    // 1. Post SALE DEBIT for total sale amount
    await LedgerService.recordEvent({
      tenantId,
      customerId,
      type: 'SALE',
      direction: 'DEBIT',
      amount: grandTotalPaisa,
      referenceType: 'SALE',
      referenceId: sale._id.toString(),
      description: `Invoice ${invoiceNumber} created (${saleType})`,
      createdBy: req.user ? req.user.userId : null
    });

    // 2. If immediate partial or full cash was paid at checkout, post PAYMENT CREDIT
    if (amountPaidPaisa > 0) {
      await LedgerService.recordEvent({
        tenantId,
        customerId,
        type: 'PAYMENT',
        direction: 'CREDIT',
        amount: amountPaidPaisa,
        referenceType: 'SALE',
        referenceId: sale._id.toString(),
        description: `Immediate payment received at sale for ${invoiceNumber}`,
        createdBy: req.user ? req.user.userId : null
      });
    }

    const updatedCustomer = await Customer.findById(customerId);

    res.status(201).json({
      success: true,
      data: {
        sale: {
          ...sale.toObject(),
          subtotalPKR: (sale.subtotal / 100).toFixed(2),
          discountPKR: (sale.discount / 100).toFixed(2),
          taxPKR: (sale.tax / 100).toFixed(2),
          grandTotalPKR: (sale.grandTotal / 100).toFixed(2),
          amountPaidPKR: (sale.amountPaid / 100).toFixed(2),
          amountDuePKR: (sale.amountDue / 100).toFixed(2)
        },
        customer: {
          id: updatedCustomer._id,
          name: updatedCustomer.name,
          currentBalancePKR: (updatedCustomer.currentBalance / 100).toFixed(2)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSales = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { customerId, page = 1, limit = 20, saleType, paymentStatus } = req.query;

    const query = { tenantId };
    if (customerId) query.customerId = customerId;
    if (saleType) query.saleType = saleType;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Sale.countDocuments(query);

    const sales = await Sale.find(query)
      .populate('customerId', 'name phone customerCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        sales: sales.map((s) => ({
          ...s.toObject(),
          grandTotalPKR: (s.grandTotal / 100).toFixed(2),
          amountPaidPKR: (s.amountPaid / 100).toFixed(2),
          amountDuePKR: (s.amountDue / 100).toFixed(2)
        })),
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const sale = await Sale.findOne({ _id: id, tenantId }).populate('customerId', 'name phone address customerCode');
    if (!sale) {
      throw new AppError('Sale record not found.', 404, 'SALE_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: {
        sale: {
          ...sale.toObject(),
          grandTotalPKR: (sale.grandTotal / 100).toFixed(2),
          amountPaidPKR: (sale.amountPaid / 100).toFixed(2),
          amountDuePKR: (sale.amountDue / 100).toFixed(2)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
