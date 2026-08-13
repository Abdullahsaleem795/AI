import { Customer } from '../customers/customer.model.js';
import { Sale } from '../sales/sale.model.js';
import { Payment } from '../payments/payment.model.js';
import { ReconciliationRecord } from '../reconciliation/reconciliation.model.js';
import { AuditLog } from '../audit/audit.model.js';

export const getDashboardKPIs = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Sales today
    const salesToday = await Sale.find({ tenantId, createdAt: { $gte: startOfDay } });
    let todaySalesPaisa = 0;
    let todayCreditSalesPaisa = 0;
    salesToday.forEach((s) => {
      todaySalesPaisa += s.grandTotal;
      if (s.saleType === 'CREDIT') todayCreditSalesPaisa += s.grandTotal;
    });

    // Payments today
    const paymentsToday = await Payment.find({ tenantId, status: 'SUCCESS', createdAt: { $gte: startOfDay } });
    let cashCollectedPaisa = 0;
    let digitalCollectedPaisa = 0;
    paymentsToday.forEach((p) => {
      if (p.method === 'CASH') cashCollectedPaisa += p.amount;
      else digitalCollectedPaisa += p.amount;
    });

    // Outstanding total across active customers
    const customers = await Customer.find({ tenantId, status: 'ACTIVE' });
    let totalOutstandingPaisa = 0;
    customers.forEach((c) => {
      totalOutstandingPaisa += c.currentBalance;
    });

    // Unresolved reconciliation count
    const unresolvedCount = await ReconciliationRecord.countDocuments({
      tenantId,
      status: { $in: ['REVIEW_REQUIRED', 'UNMATCHED'] }
    });

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          todaySalesPaisa,
          todaySalesPKR: (todaySalesPaisa / 100).toFixed(2),
          todayCreditSalesPaisa,
          todayCreditSalesPKR: (todayCreditSalesPaisa / 100).toFixed(2),
          cashCollectedPaisa,
          cashCollectedPKR: (cashCollectedPaisa / 100).toFixed(2),
          digitalCollectedPaisa,
          digitalCollectedPKR: (digitalCollectedPaisa / 100).toFixed(2),
          totalCollectedPKR: ((cashCollectedPaisa + digitalCollectedPaisa) / 100).toFixed(2),
          totalOutstandingPaisa,
          totalOutstandingPKR: (totalOutstandingPaisa / 100).toFixed(2),
          unresolvedReconciliationAlerts: unresolvedCount,
          totalCustomersCount: customers.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments({ tenantId });

    const logs = await AuditLog.find({ tenantId })
      .populate('userId', 'name email roles')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        logs,
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
