import { Customer } from '../customers/customer.model.js';
import { LedgerEntry } from '../ledger/ledger.model.js';
import { RaastAdapter } from '../../integrations/payments/RaastAdapter.js';
import { NotificationService } from '../notifications/notification.service.js';

const raastAdapter = new RaastAdapter();

export const getCollectionsSummary = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;

    const customersWithBalance = await Customer.find({
      tenantId,
      currentBalance: { $gt: 0 },
      status: 'ACTIVE'
    });

    let totalOutstanding = 0;
    const customerIds = customersWithBalance.map((c) => c._id);
    customersWithBalance.forEach((c) => {
      totalOutstanding += c.currentBalance;
    });

    // Calculate aging buckets based on oldest unpaid ledger sales
    const now = Date.now();
    const buckets = {
      days0to7: 0,
      days8to30: 0,
      days31to60: 0,
      days61to90: 0,
      days90Plus: 0
    };

    let overdueAmount = 0;

    // Retrieve recent DEBIT sales entries for these customers
    const salesEntries = await LedgerEntry.find({
      tenantId,
      customerId: { $in: customerIds },
      type: 'SALE',
      direction: 'DEBIT'
    }).sort({ createdAt: -1 });

    for (const customer of customersWithBalance) {
      const custEntries = salesEntries.filter((e) => e.customerId.toString() === customer._id.toString());
      if (custEntries.length === 0) {
        buckets.days0to7 += customer.currentBalance;
        continue;
      }

      const oldestEntry = custEntries[custEntries.length - 1];
      const diffDays = Math.floor((now - new Date(oldestEntry.createdAt).getTime()) / (1000 * 3600 * 24));

      if (diffDays > 7) overdueAmount += customer.currentBalance;

      if (diffDays <= 7) buckets.days0to7 += customer.currentBalance;
      else if (diffDays <= 30) buckets.days8to30 += customer.currentBalance;
      else if (diffDays <= 60) buckets.days31to60 += customer.currentBalance;
      else if (diffDays <= 90) buckets.days61to90 += customer.currentBalance;
      else buckets.days90Plus += customer.currentBalance;
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOutstandingPaisa: totalOutstanding,
          totalOutstandingPKR: (totalOutstanding / 100).toFixed(2),
          overdueAmountPaisa: overdueAmount,
          overdueAmountPKR: (overdueAmount / 100).toFixed(2),
          totalDebtorsCount: customersWithBalance.length
        },
        aging: {
          days0to7PKR: (buckets.days0to7 / 100).toFixed(2),
          days8to30PKR: (buckets.days8to30 / 100).toFixed(2),
          days31to60PKR: (buckets.days31to60 / 100).toFixed(2),
          days61to90PKR: (buckets.days61to90 / 100).toFixed(2),
          days90PlusPKR: (buckets.days90Plus / 100).toFixed(2)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getOverdueCustomers = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { sortBy = 'amount', limit = 50 } = req.query;

    const query = { tenantId, currentBalance: { $gt: 0 }, status: 'ACTIVE' };
    const sortField = sortBy === 'amount' ? { currentBalance: -1 } : { updatedAt: -1 };

    const customers = await Customer.find(query).sort(sortField).limit(parseInt(limit));

    // Fetch last payment date for each customer
    const results = await Promise.all(
      customers.map(async (c) => {
        const lastPayment = await LedgerEntry.findOne({
          tenantId,
          customerId: c._id,
          type: 'PAYMENT'
        }).sort({ createdAt: -1 });

        const daysSinceLastPayment = lastPayment
          ? Math.floor((Date.now() - new Date(lastPayment.createdAt).getTime()) / (1000 * 3600 * 24))
          : null;

        return {
          id: c._id,
          name: c.name,
          phone: c.phone,
          customerCode: c.customerCode,
          currentBalancePaisa: c.currentBalance,
          currentBalancePKR: (c.currentBalance / 100).toFixed(2),
          creditLimitPKR: (c.creditLimit / 100).toFixed(2),
          lastPaymentDate: lastPayment ? lastPayment.createdAt : null,
          daysSinceLastPayment
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        customers: results
      }
    });
  } catch (error) {
    next(error);
  }
};

export const sendReminder = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { customerId, channel = 'WHATSAPP' } = req.body;

    const customer = await Customer.findOne({ _id: customerId, tenantId });
    if (!customer) {
      throw new Error('Customer not found.');
    }

    const ref = `REM-${Date.now()}`;
    const raastLink = await raastAdapter.createPaymentRequest({
      tenantId,
      customer,
      amountPaisa: customer.currentBalance,
      reference: ref
    });

    const result = await NotificationService.sendPaymentReminder(tenantId, customer, raastLink.paymentUrl, channel);

    res.status(200).json({
      success: true,
      data: {
        message: `Payment reminder queued via ${channel}`,
        delivery: result
      }
    });
  } catch (error) {
    next(error);
  }
};
