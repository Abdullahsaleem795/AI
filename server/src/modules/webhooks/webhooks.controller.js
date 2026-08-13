import { RaastAdapter } from '../../integrations/payments/RaastAdapter.js';
import { ReconciliationEngine } from '../reconciliation/reconciliation.service.js';
import { Tenant } from '../tenants/tenant.model.js';
import logger from '../../utils/logger.js';

const raastAdapter = new RaastAdapter();

export const handlePaymentWebhook = async (req, res, next) => {
  try {
    const { provider } = req.params;
    const body = req.body;

    logger.info(`Received Webhook for provider ${provider}`, { body });

    // Validate Signature
    const isValid = raastAdapter.verifyWebhookSignature(req.headers, body);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'INVALID_SIGNATURE' });
    }

    const payload = raastAdapter.parseWebhookPayload(body);

    // Resolve tenantId from header or body or default first tenant in sandbox
    let tenantId = req.headers['x-tenant-id'] || body.tenantId;
    if (!tenantId) {
      const defaultTenant = await Tenant.findOne({ status: 'ACTIVE' });
      if (!defaultTenant) {
        return res.status(400).json({ success: false, error: 'TENANT_NOT_FOUND' });
      }
      tenantId = defaultTenant._id;
    }

    const result = await ReconciliationEngine.processIncomingPayment(tenantId, payload);

    res.status(200).json({
      success: true,
      data: {
        received: true,
        reconciled: result.reconciliation ? result.reconciliation.status === 'AUTO_RECONCILED' : false,
        status: result.reconciliation ? result.reconciliation.status : null,
        paymentId: result.payment._id,
        duplicate: result.duplicate || false
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      logger.info('Concurrent idempotent webhook detected (E11000). Returning 200.');
      return res.status(200).json({ success: true, data: { received: true, duplicate: true } });
    }
    logger.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
