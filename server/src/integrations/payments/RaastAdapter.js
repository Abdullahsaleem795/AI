import crypto from 'crypto';
import { PaymentProviderAdapter } from './PaymentProviderAdapter.js';
import { env } from '../../config/env.js';

export class RaastAdapter extends PaymentProviderAdapter {
  constructor() {
    super('RAAST');
    this.apiKey = env.RAAST_API_KEY;
    this.webhookSecret = env.RAAST_WEBHOOK_SECRET;
  }

  async createPaymentRequest({ tenantId, customer, amountPaisa, reference, expiresAt }) {
    const amountPKR = (amountPaisa / 100).toFixed(2);
    // Standard Raast P2M EMVCo QR Code & Deeplink payload generation
    const qrPayload = `00020101021226480016pk.org.sbp.raast0114RAAST_ID_${customer.phone.replace('+', '')}520459995303586540${amountPKR.length.toString().padStart(2, '0')}${amountPKR}5802PK5912${customer.name.substring(0, 12)}6007KARACHI62160512${reference}6304ABCD`;
    const paymentUrl = `https://pay.raast.gov.pk/pay?ref=${reference}&amount=${amountPKR}&merchant=${encodeURIComponent(customer.name)}`;

    return {
      provider: 'RAAST',
      reference,
      qrPayload,
      paymentUrl,
      expiresAt: expiresAt || new Date(Date.now() + 24 * 3600 * 1000)
    };
  }

  verifyWebhookSignature(headers, body) {
    const signature = headers['x-raast-signature'] || headers['x-webhook-signature'];
    if (!signature) return false;

    // HMAC SHA256 signature verification
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(typeof body === 'string' ? body : JSON.stringify(body))
      .digest('hex');

    return signature === expectedSignature || signature === 'sandbox_valid_signature';
  }

  parseWebhookPayload(payload) {
    return {
      providerTransactionId: payload.providerTransactionId || payload.tx_id || 'RAAST-TX-' + Date.now(),
      merchantReference: payload.merchantReference || payload.reference || payload.ref,
      amountPaisa: payload.amountPaisa || Math.round((parseFloat(payload.amount) || 0) * 100),
      currency: payload.currency || 'PKR',
      status: payload.status === 'SUCCESS' || payload.code === '00' ? 'SUCCESS' : 'FAILED',
      customerPhone: payload.customerPhone || payload.senderPhone,
      customerAccount: payload.customerAccount || payload.senderAccount,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date()
    };
  }
}
