import { WhatsAppAdapter } from '../../integrations/notifications/WhatsAppAdapter.js';
import { Tenant } from '../tenants/tenant.model.js';

const whatsapp = new WhatsAppAdapter();

export class NotificationService {
  static async sendReceipt(tenantId, customer, paymentAmountPaisa, remainingBalancePaisa, channel = 'WHATSAPP') {
    const tenant = await Tenant.findById(tenantId);
    const shopName = tenant ? tenant.name : 'Digital Store';
    const amountPKR = (paymentAmountPaisa / 100).toFixed(2);
    const balancePKR = (remainingBalancePaisa / 100).toFixed(2);

    const message = `Payment Received: Rs. ${amountPKR}\nCustomer: ${customer.name}\nRemaining Balance: Rs. ${balancePKR}\nThank you for doing business with ${shopName}!`;

    return await whatsapp.sendTextMessage(customer.phone, message);
  }

  static async sendPaymentReminder(tenantId, customer, paymentUrl, channel = 'WHATSAPP') {
    const tenant = await Tenant.findById(tenantId);
    const shopName = tenant ? tenant.name : 'Digital Store';
    const balancePKR = (customer.currentBalance / 100).toFixed(2);

    const message = `Assalam-o-Alaikum ${customer.name},\nYour current outstanding balance with ${shopName} is Rs. ${balancePKR}.\nPlease clear your account balance at your earliest convenience.\nDirect Raast Payment Link: ${paymentUrl || 'Contact Shop'}`;

    return await whatsapp.sendTextMessage(customer.phone, message);
  }
}
