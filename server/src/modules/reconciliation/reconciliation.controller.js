import { ReconciliationRecord } from './reconciliation.model.js';
import { ReconciliationEngine } from './reconciliation.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export const getUnmatchedReconciliations = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { page = 1, limit = 20, status } = req.query;

    const query = { tenantId };
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['REVIEW_REQUIRED', 'UNMATCHED'] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ReconciliationRecord.countDocuments(query);

    const records = await ReconciliationRecord.find(query)
      .populate('paymentId')
      .populate('customerId', 'name phone customerCode currentBalance')
      .populate('matchCandidates.customerId', 'name phone customerCode currentBalance')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        reconciliations: records.map((r) => ({
          ...r.toObject(),
          paymentAmountPKR: r.paymentId ? (r.paymentId.amount / 100).toFixed(2) : '0.00'
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

export const resolveReconciliation = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { customerId } = req.body;

    if (!customerId) {
      throw new AppError('Customer ID is required to resolve reconciliation.', 400, 'VALIDATION_ERROR');
    }

    const userId = req.user ? req.user.userId : null;
    const result = await ReconciliationEngine.resolveManually(tenantId, id, customerId, userId);

    res.status(200).json({
      success: true,
      data: {
        message: 'Payment successfully matched and reconciled.',
        reconciliation: result.reconciliation
      }
    });
  } catch (error) {
    next(error);
  }
};
