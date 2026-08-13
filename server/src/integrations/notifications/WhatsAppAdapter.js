import logger from '../../utils/logger.js';
import { env } from '../../config/env.js';

export class WhatsAppAdapter {
  constructor() {
    this.apiKey = env.WHATSAPP_API_KEY;
    this.phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
  }

  async sendTextMessage(toPhone, message) {
    logger.info(`[WhatsApp API Sandbox] Dispatching message to ${toPhone}: "${message}"`);
    return {
      success: true,
      messageId: `wa_msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      channel: 'WHATSAPP',
      recipient: toPhone,
      status: 'DELIVERED',
      sentAt: new Date()
    };
  }
}
