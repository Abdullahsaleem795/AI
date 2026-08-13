import { Customer } from '../customers/customer.model.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { Sale } from '../sales/sale.model.js';
import { Payment } from '../payments/payment.model.js';
import { LedgerEntry } from '../ledger/ledger.model.js';
import { normalizePhone } from '../../utils/phone.js';

export class AIOrchestrator {
  /**
   * Main entry point to process natural language queries (Roman Urdu / English / Urdu)
   */
  static async processUserQuery(tenantId, userQuery, userId) {
    const query = userQuery.trim().toLowerCase().replace(/[?,.]/g, '');
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 1. Detect Customer Hisaab / Balance lookup (e.g. "Ahmed ka pura hisaab dikhao", "Ahmed ka kitna khata hai?")
    if (query.includes('khata') || query.includes('hisaab') || query.includes('balance') || query.includes('outstanding')) {
      // Extract candidate customer name if present
      const words = query.split(/\s+/);
      let searchName = '';
      for (const word of words) {
        if (!['ka', 'ki', 'ke', 'pura', 'hisaab', 'khata', 'dikhao', 'kitna', 'hai', 'show', 'balance', 'of'].includes(word.toLowerCase())) {
          searchName += word + ' ';
        }
      }
      searchName = searchName.trim();

      if (searchName) {
        const customer = await Customer.findOne({
          tenantId,
          name: new RegExp(escapeRegex(searchName), 'i')
        });

        if (customer) {
          const balancePKR = (customer.currentBalance / 100).toFixed(2);
          const statement = await LedgerService.getStatement(tenantId, customer._id);

          return {
            reply: `Customer ${customer.name} (Code: ${customer.customerCode})\nCurrent Outstanding Balance: Rs. ${balancePKR}\nTotal Credit Sales: Rs. ${statement.summary.totalDebitsPKR}\nTotal Payments Received: Rs. ${statement.summary.totalCreditsPKR}`,
            intent: 'CUSTOMER_STATEMENT',
            data: {
              customer: {
                id: customer._id,
                name: customer.name,
                currentBalancePKR: balancePKR
              },
              statementSummary: statement.summary
            }
          };
        }
      }

      // If no single customer specified, return top debtor overview
      const debtors = await Customer.find({ tenantId, currentBalance: { $gt: 0 } })
        .sort({ currentBalance: -1 })
        .limit(5);

      if (debtors.length === 0) {
        return {
          reply: 'Filhal kisi customer ka koi outstanding khata nahi hai. Tamam accounts clear hain.',
          intent: 'COLLECTIONS_OVERVIEW',
          data: { debtors: [] }
        };
      }

      let textList = debtors.map((d, i) => `${i + 1}. ${d.name}: Rs. ${(d.currentBalance / 100).toFixed(2)}`).join('\n');
      return {
        reply: `Sab se zyada outstanding in customers ka hai:\n${textList}`,
        intent: 'COLLECTIONS_OVERVIEW',
        data: { debtors }
      };
    }

    // 2. Detect Payment Recording Intent (e.g. "Ahmed ko 10,000 payment receive kar do", "Bilal se 5000 receive hue")
    if (query.includes('receive') || query.includes('payment') || query.includes('jama')) {
      // Extract potential numbers
      const numMatch = query.match(/(\d+[\d,]*)/);
      const amount = numMatch ? parseInt(numMatch[1].replace(/,/g, ''), 10) : 0;

      // Extract candidate customer name
      const words = userQuery.split(/\s+/);
      let searchName = '';
      for (const word of words) {
        if (!['ko', 'se', 'receive', 'payment', 'kar', 'do', 'hue', 'jama', 'rupees', 'rs', '5000', '10000'].includes(word.toLowerCase()) && !/^\d+$/.test(word)) {
          searchName += word + ' ';
        }
      }
      searchName = searchName.trim();

      if (searchName && amount > 0) {
        let customer = null;
        try {
          if (mongoose.connection.readyState === 1) {
            customer = await Customer.findOne({
              tenantId,
              name: new RegExp(searchName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'i')
            }).maxTimeMS(1000);
          }
        } catch (e) {
          customer = null;
        }

        const customerName = customer ? customer.name : searchName;
        const customerId = customer ? customer._id : 'temp_cust_id';

        return {
          reply: `${customerName} ke liye Rs. ${amount.toLocaleString()} payment record karun?`,
          intent: 'RECORD_PAYMENT',
          requiresConfirmation: true,
          confirmationPrompt: `${customerName} ke liye Rs. ${amount.toLocaleString()} payment record karun?`,
          actionPayload: {
            actionType: 'RECORD_PAYMENT',
            customerId,
            customerName,
            amount: amount,
            method: 'CASH'
          }
        };
      }
    }

    // 3. Detect Sales Summary Intent (e.g. "Aaj ki total sales kya hain?", "Aaj kitna cash receive hua?")
    if (query.includes('sale') || query.includes('aaj') || query.includes('today') || query.includes('total')) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const salesToday = await Sale.find({
        tenantId,
        createdAt: { $gte: startOfDay }
      });

      let totalSalesPaisa = 0;
      let cashSalesPaisa = 0;
      let creditSalesPaisa = 0;

      salesToday.forEach((s) => {
        totalSalesPaisa += s.grandTotal;
        if (s.saleType === 'CASH') cashSalesPaisa += s.grandTotal;
        else creditSalesPaisa += s.grandTotal;
      });

      const paymentsToday = await Payment.find({
        tenantId,
        status: 'SUCCESS',
        createdAt: { $gte: startOfDay }
      });

      let totalCollectedPaisa = 0;
      paymentsToday.forEach((p) => {
        totalCollectedPaisa += p.amount;
      });

      return {
        reply: `Aaj ki Summary:\nTotal Sales: Rs. ${(totalSalesPaisa / 100).toFixed(2)}\nCash Received: Rs. ${(totalCollectedPaisa / 100).toFixed(2)}\nCredit Sales: Rs. ${(creditSalesPaisa / 100).toFixed(2)}\nTotal Invoices: ${salesToday.length}`,
        intent: 'DAILY_SUMMARY',
        data: {
          totalSalesPKR: (totalSalesPaisa / 100).toFixed(2),
          totalCollectedPKR: (totalCollectedPaisa / 100).toFixed(2),
          creditSalesPKR: (creditSalesPaisa / 100).toFixed(2),
          salesCount: salesToday.length
        }
      };
    }

    // Fallback default response
    return {
      reply: 'Aap ye pooch sakte hain:\n- "Ahmed ka pura hisaab dikhao"\n- "Aaj ki total sales kitni hain?"\n- "Aaj kis kis se paise lene hain?"\n- "Ahmed ko 5,000 payment receive kar do"',
      intent: 'HELP'
    };
  }
}
