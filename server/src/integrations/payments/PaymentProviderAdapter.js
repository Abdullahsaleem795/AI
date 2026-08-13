export class PaymentProviderAdapter {
  constructor(providerName) {
    this.providerName = providerName;
  }

  async createPaymentRequest({ tenantId, customer, amountPaisa, reference, expiresAt }) {
    throw new Error('createPaymentRequest must be implemented by payment adapter.');
  }

  verifyWebhookSignature(headers, rawBody) {
    throw new Error('verifyWebhookSignature must be implemented by payment adapter.');
  }

  parseWebhookPayload(payload) {
    throw new Error('parseWebhookPayload must be implemented by payment adapter.');
  }
}
