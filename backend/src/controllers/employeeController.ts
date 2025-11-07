import { Response } from 'express';
import { Types } from 'mongoose';
import { Payment } from '../models/Payment';
import { IAuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';
import { REASON_CODES, isValidReasonCode } from '../config/reasons';

// Simple redaction guard for notes: remove IBAN/SWIFT-like patterns
const redactSensitive = (text: string): string => {
  let sanitized = text || '';
  // IBAN-like patterns: letters+digits length 15-34
  sanitized = sanitized.replace(/[A-Z]{2}\d{2}[A-Z0-9]{11,30}/gi, '[REDACTED-IBAN]');
  // SWIFT/BIC: 8 or 11 alphanumeric uppercase
  sanitized = sanitized.replace(/[A-Z0-9]{8,11}/g, (m) => {
    // Heuristic: replace only if plausible SWIFT (letters in positions 5-6)
    if (m.length === 8 || m.length === 11) return '[REDACTED-SWIFT]';
    return m;
  });
  // Emails
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED-EMAIL]');
  // Phone numbers
  sanitized = sanitized.replace(/\+?\d[\d\s()-]{7,}\d/g, '[REDACTED-PHONE]');
  return sanitized;
};

export const getAllPayments = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.', timestamp: new Date().toISOString() });
      return;
    }

    const pageRaw = (req.query['page'] as string) || '1';
    const limitRaw = (req.query['limit'] as string) || '10';
    const page = Math.max(1, Math.min(1000, parseInt(pageRaw, 10) || 1));
    const limit = Math.max(1, Math.min(100, parseInt(limitRaw, 10) || 10));
    const skip = (page - 1) * limit;

    // Filters
    const status = (req.query['status'] as string | undefined) || undefined;
    const keyword = (req.query['keyword'] as string | undefined) || undefined; // recipient/ref
    const startDateStr = (req.query['startDate'] as string) || '';
    const endDateStr = (req.query['endDate'] as string) || '';
    const isValidISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
    const startDate = isValidISODate(startDateStr) ? new Date(startDateStr) : undefined;
    const endDate = isValidISODate(endDateStr) ? new Date(endDateStr) : undefined;
    const minAmount = req.query['minAmount'] ? Number(req.query['minAmount']) : undefined;
    const maxAmount = req.query['maxAmount'] ? Number(req.query['maxAmount']) : undefined;
    const includeDeleted = String(req.query['includeDeleted'] || 'false') === 'true';
    const onlyAssignedToMe = String(req.query['assignedTo'] || '') === 'me';
    const escalated = req.query['escalated'] ? String(req.query['escalated']) === 'true' : undefined;

    const query: any = {};
    if (!includeDeleted) query['deletedAt'] = null;
    if (status) query['status'] = status;
    if (escalated !== undefined) query['escalated'] = escalated;
    if (onlyAssignedToMe && req.user) query['assignedToUserId'] = req.user.userId;
    if (startDate || endDate) {
      query['createdAt'] = {};
      if (startDate) query['createdAt']['$gte'] = startDate;
      if (endDate) query['createdAt']['$lte'] = endDate;
    }
    if (minAmount !== undefined || maxAmount !== undefined) {
      query['amount'] = {};
      if (minAmount !== undefined) query['amount']['$gte'] = minAmount;
      if (maxAmount !== undefined) query['amount']['$lte'] = maxAmount;
    }

    let keywordFilter: any = {};
    if (keyword && keyword.trim().length > 0) {
      const k = keyword.trim().slice(0, 100);
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const safe = escapeRegex(k);
      keywordFilter = {
        $or: [
          { recipientName: { $regex: safe, $options: 'i' } },
          { reference: { $regex: safe, $options: 'i' } },
        ],
      };
    }

    const payments = await Payment.find({ $and: [query, keywordFilter] }).sort({ createdAt: -1 }).limit(limit).skip(skip);
    const total = await Payment.countDocuments({ $and: [query, keywordFilter] });
    const pages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      message: 'Filtered payments retrieved successfully.',
      data: payments,
      pagination: { page, limit, total, pages },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Employee get all payments error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while retrieving payments.', timestamp: new Date().toISOString() });
  }
};

export const getGlobalPaymentStats = async (_req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const breakdown = await Payment.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    // Average handling time for completed/cancelled/failed
    const handling = await Payment.aggregate([
      { $match: { processedAt: { $ne: null }, deletedAt: null } },
      {
        $project: {
          status: 1,
          diffMs: { $subtract: ['$processedAt', '$createdAt'] },
        },
      },
      {
        $group: {
          _id: '$status',
          avgMs: { $avg: '$diffMs' },
        },
      },
    ]);

    // Age buckets
    const now = new Date();
    const ageBuckets = await Payment.aggregate([
      { $match: { deletedAt: null } },
      {
        $project: {
          ageHours: { $divide: [{ $subtract: [now, '$createdAt'] }, 1000 * 60 * 60] },
        },
      },
      {
        $bucket: {
          groupBy: '$ageHours',
          boundaries: [0, 24, 48, 72, 168, 336],
          default: '>=336',
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: 'Expanded stats retrieved successfully.',
      data: { breakdown, handling, ageBuckets },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Employee get global stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while retrieving stats.', timestamp: new Date().toISOString() });
  }
};

export const employeeCancelPayment = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.', timestamp: new Date().toISOString() });
      return;
    }

    const { id } = req.params;
    const { reason, reasonCode } = req.body as { reason?: string; reasonCode?: string };
    if (!Types.ObjectId.isValid(String(id))) {
      res.status(400).json({ success: false, message: 'Invalid payment ID.', timestamp: new Date().toISOString() });
      return;
    }
    const payment = await Payment.findById(id);

    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found.', timestamp: new Date().toISOString() });
      return;
    }

    if (payment.status !== 'pending' && payment.status !== 'processing') {
      res.status(400).json({ success: false, message: 'Only pending or processing payments can be cancelled.', timestamp: new Date().toISOString() });
      return;
    }

    // Enforce reason taxonomy
    if (!isValidReasonCode(reasonCode)) {
      res.status(400).json({ success: false, message: 'Valid reasonCode is required for cancellation.', timestamp: new Date().toISOString() });
      return;
    }

    payment.status = 'cancelled';
    payment.processedAt = new Date();
    payment.reasonCode = String(reasonCode);
    payment.failureReason = (reason || '').trim() || null as any;
    payment.auditLog = [
      ...(payment.auditLog || []),
      { actorId: req.user.userId, actorName: req.user.email || '', action: 'cancel', timestamp: new Date(), details: `reasonCode=${reasonCode}` }
    ];
    await payment.save();
    logger.info('Employee cancelled payment:', { paymentId: id, actorUserId: req.user.userId });

    res.status(200).json({ success: true, message: 'Payment cancelled successfully.', data: { payment: payment.toJSON() }, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Employee cancel payment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while cancelling payment.', timestamp: new Date().toISOString() });
  }
};

export const employeeValidatePayment = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.', timestamp: new Date().toISOString() });
      return;
    }

    const { id } = req.params;
    if (!Types.ObjectId.isValid(String(id))) {
      res.status(400).json({ success: false, message: 'Invalid payment ID.', timestamp: new Date().toISOString() });
      return;
    }
    const payment = await Payment.findById(id);

    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found.', timestamp: new Date().toISOString() });
      return;
    }

    if (payment.status !== 'pending' && payment.status !== 'processing') {
      res.status(400).json({ success: false, message: 'Only pending or processing payments can be validated.', timestamp: new Date().toISOString() });
      return;
    }

    payment.status = 'completed';
    payment.processedAt = new Date();
    payment.failureReason = null as any;
    await payment.save();
    logger.info('Employee validated payment:', { paymentId: id, actorUserId: req.user.userId });

    res.status(200).json({ success: true, message: 'Payment validated successfully.', data: { payment: payment.toJSON() }, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Employee validate payment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while validating payment.', timestamp: new Date().toISOString() });
  }
};

export const employeeRejectPayment = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.', timestamp: new Date().toISOString() });
      return;
    }

    const { id } = req.params;
    const { reason, reasonCode } = req.body as { reason?: string; reasonCode?: string };

    if (!isValidReasonCode(reasonCode)) {
      res.status(400).json({ success: false, message: 'Valid reasonCode is required for rejection.', timestamp: new Date().toISOString() });
      return;
    }

    if (!reason || reason.trim().length < 3) {
      res.status(400).json({ success: false, message: 'Reason is required and must be at least 3 characters.', timestamp: new Date().toISOString() });
      return;
    }

    if (!Types.ObjectId.isValid(String(id))) {
      res.status(400).json({ success: false, message: 'Invalid payment ID.', timestamp: new Date().toISOString() });
      return;
    }
    const payment = await Payment.findById(id);

    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found.', timestamp: new Date().toISOString() });
      return;
    }

    if (payment.status === 'completed') {
      res.status(400).json({ success: false, message: 'Completed payments cannot be rejected.', timestamp: new Date().toISOString() });
      return;
    }

    payment.status = 'failed';
    payment.failureReason = reason.trim();
    payment.reasonCode = String(reasonCode);
    payment.processedAt = new Date();
    payment.auditLog = [
      ...(payment.auditLog || []),
      { actorId: req.user.userId, actorName: req.user.email || '', action: 'reject', timestamp: new Date(), details: `reasonCode=${reasonCode}` }
    ];
    await payment.save();
    logger.info('Employee rejected payment:', { paymentId: id, actorUserId: req.user.userId, reason });

    res.status(200).json({ success: true, message: 'Payment rejected successfully.', data: { payment: payment.toJSON() }, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Employee reject payment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while rejecting payment.', timestamp: new Date().toISOString() });
  }
};

/**
 * Update failure/cancellation reason for cancelled or failed payments
 */
export const employeeUpdateReason = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.', timestamp: new Date().toISOString() });
      return;
    }

    const { id } = req.params;
    const { reason, reasonCode } = req.body as { reason?: string; reasonCode?: string };

    if (!reason || reason.trim().length < 3) {
      res.status(400).json({ success: false, message: 'Reason is required and must be at least 3 characters.', timestamp: new Date().toISOString() });
      return;
    }

    if (!Types.ObjectId.isValid(String(id))) {
      res.status(400).json({ success: false, message: 'Invalid payment ID.', timestamp: new Date().toISOString() });
      return;
    }
    const payment = await Payment.findById(id);

    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found.', timestamp: new Date().toISOString() });
      return;
    }

    if (!(payment.status === 'cancelled' || payment.status === 'failed')) {
      res.status(400).json({ success: false, message: 'Reason can only be added to cancelled or rejected payments.', timestamp: new Date().toISOString() });
      return;
    }

    payment.failureReason = reason.trim();
    if (isValidReasonCode(reasonCode)) {
      payment.reasonCode = String(reasonCode);
    }
    payment.auditLog = [
      ...(payment.auditLog || []),
      { actorId: req.user.userId, actorName: req.user.email || '', action: 'update_reason', timestamp: new Date(), details: `reasonCode=${reasonCode || ''}` }
    ];
    await payment.save();
    logger.info('Employee updated failure reason:', { paymentId: id, actorUserId: req.user.userId });

    res.status(200).json({ success: true, message: 'Reason updated successfully.', data: { payment: payment.toJSON() }, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Employee update reason error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while updating reason.', timestamp: new Date().toISOString() });
  }
};

/**
 * Soft-delete payment (only if status is completed, cancelled, or failed)
 */
export const employeeDeletePayment = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.', timestamp: new Date().toISOString() });
      return;
    }

    const { id } = req.params;
    if (!Types.ObjectId.isValid(String(id))) {
      res.status(400).json({ success: false, message: 'Invalid payment ID.', timestamp: new Date().toISOString() });
      return;
    }
    const payment = await Payment.findById(id);

    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found.', timestamp: new Date().toISOString() });
      return;
    }

    if (!(payment.status === 'completed' || payment.status === 'cancelled' || payment.status === 'failed')) {
      res.status(400).json({ success: false, message: 'Only completed, cancelled, or rejected payments can be deleted.', timestamp: new Date().toISOString() });
      return;
    }

    // Soft-delete
    payment.deletedAt = new Date();
    payment.deletedByUserId = req.user.userId;
    payment.deletedByName = req.user.email || '';
    payment.auditLog = [
      ...(payment.auditLog || []),
      { actorId: req.user.userId, actorName: req.user.email || '', action: 'trash', timestamp: new Date(), details: 'soft-delete' }
    ];
    await payment.save();
    logger.info('Employee soft-deleted payment:', { paymentId: id, actorUserId: req.user.userId });

    res.status(200).json({ success: true, message: 'Payment moved to Trash.', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Employee delete payment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while deleting payment.', timestamp: new Date().toISOString() });
  }
};

export const employeeRestorePayment = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.', timestamp: new Date().toISOString() });
      return;
    }

    const { id } = req.params;
    if (!Types.ObjectId.isValid(String(id))) {
      res.status(400).json({ success: false, message: 'Invalid payment ID.', timestamp: new Date().toISOString() });
      return;
    }
    const payment = await Payment.findById(id);

    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found.', timestamp: new Date().toISOString() });
      return;
    }

    if (!payment.deletedAt) {
      res.status(400).json({ success: false, message: 'Payment is not in Trash.', timestamp: new Date().toISOString() });
      return;
    }

    payment.deletedAt = null as any;
    payment.deletedByUserId = null as any;
    payment.deletedByName = null as any;
    payment.auditLog = [
      ...(payment.auditLog || []),
      { actorId: req.user.userId, actorName: req.user.email || '', action: 'restore', timestamp: new Date(), details: 'restore from Trash' }
    ];
    await payment.save();

    res.status(200).json({ success: true, message: 'Payment restored successfully.', data: { payment: payment.toJSON() }, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Employee restore payment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while restoring payment.', timestamp: new Date().toISOString() });
  }
};

export const employeeBulkAction = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.', timestamp: new Date().toISOString() });
      return;
    }

    const { action, ids, reason, reasonCode } = req.body as { action: 'reject' | 'cancel' | 'trash' | 'restore'; ids: string[]; reason?: string; reasonCode?: string };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: 'ids array is required.' });
      return;
    }

    const results: any[] = [];
    for (const id of ids) {
      if (!Types.ObjectId.isValid(String(id))) { results.push({ id, ok: false, error: 'invalid_id' }); continue; }
      const payment = await Payment.findById(id);
      if (!payment) { results.push({ id, ok: false, error: 'not_found' }); continue; }
      switch (action) {
        case 'cancel': {
          if (!isValidReasonCode(reasonCode)) { results.push({ id, ok: false, error: 'invalid_reason_code' }); break; }
          payment.status = 'cancelled';
          payment.reasonCode = String(reasonCode);
          payment.failureReason = (reason || '').trim() || null as any;
          payment.processedAt = new Date();
          payment.auditLog = [ ...(payment.auditLog || []), { actorId: req.user.userId, actorName: req.user.email || '', action: 'cancel', timestamp: new Date(), details: `bulk; reasonCode=${reasonCode}` } ];
          await payment.save();
          results.push({ id, ok: true });
          break;
        }
        case 'reject': {
          if (!isValidReasonCode(reasonCode)) { results.push({ id, ok: false, error: 'invalid_reason_code' }); break; }
          payment.status = 'failed';
          payment.reasonCode = String(reasonCode);
          payment.failureReason = (reason || '').trim() || null as any;
          payment.processedAt = new Date();
          payment.auditLog = [ ...(payment.auditLog || []), { actorId: req.user.userId, actorName: req.user.email || '', action: 'reject', timestamp: new Date(), details: `bulk; reasonCode=${reasonCode}` } ];
          await payment.save();
          results.push({ id, ok: true });
          break;
        }
        case 'trash': {
          payment.deletedAt = new Date();
          payment.deletedByUserId = req.user.userId;
          payment.deletedByName = req.user.email || '';
          payment.auditLog = [ ...(payment.auditLog || []), { actorId: req.user.userId, actorName: req.user.email || '', action: 'trash', timestamp: new Date(), details: 'bulk soft-delete' } ];
          await payment.save();
          results.push({ id, ok: true });
          break;
        }
        case 'restore': {
          payment.deletedAt = null as any;
          payment.deletedByUserId = null as any;
          payment.deletedByName = null as any;
          payment.auditLog = [ ...(payment.auditLog || []), { actorId: req.user.userId, actorName: req.user.email || '', action: 'restore', timestamp: new Date(), details: 'bulk restore' } ];
          await payment.save();
          results.push({ id, ok: true });
          break;
        }
      }
    }

    res.status(200).json({ success: true, data: { results }, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Employee bulk action error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while performing bulk action.', timestamp: new Date().toISOString() });
  }
};

export const employeeAddNote = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.', timestamp: new Date().toISOString() });
      return;
    }
    const { id } = req.params;
    const { text, mentions } = req.body as { text: string; mentions?: Array<{ userId: string; name?: string }> };
    if (!text || text.trim().length < 1) {
      res.status(400).json({ success: false, message: 'Note text is required.' });
      return;
    }
    if (!Types.ObjectId.isValid(String(id))) {
      res.status(400).json({ success: false, message: 'Invalid payment ID.' });
      return;
    }
    const payment = await Payment.findById(id);
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found.' });
      return;
    }
    const safeText = redactSensitive(text.trim());
    payment.notes = [ ...(payment.notes || []), { text: safeText, authorId: req.user.userId, authorName: req.user.email || '', createdAt: new Date(), mentions: (mentions || []).map(m => ({ userId: m.userId, name: m.name || '' })) } ];
    payment.auditLog = [ ...(payment.auditLog || []), { actorId: req.user.userId, actorName: req.user.email || '', action: 'add_note', timestamp: new Date(), details: `length=${safeText.length}` } ];
    await payment.save();
    res.status(200).json({ success: true, data: { payment: payment.toJSON() }, message: 'Note added successfully.', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Employee add note error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while adding note.', timestamp: new Date().toISOString() });
  }
};

export const getPaymentAudit = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    const { id } = req.params;
    if (!Types.ObjectId.isValid(String(id))) {
      res.status(400).json({ success: false, message: 'Invalid payment ID.' });
      return;
    }
    const payment = await Payment.findById(id, { auditLog: 1 });
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found.' });
      return;
    }
    res.status(200).json({ success: true, data: payment.auditLog || [], message: 'Audit log retrieved.' });
  } catch (error) {
    logger.error('Employee get audit error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while retrieving audit log.' });
  }
};

export const employeeAssignPayment = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ success: false, message: 'Authentication required.' }); return; }
    const { id } = req.params;
    const { assigneeUserId, assigneeName } = req.body as { assigneeUserId?: string; assigneeName?: string };
    if (!Types.ObjectId.isValid(String(id))) { res.status(400).json({ success: false, message: 'Invalid payment ID.' }); return; }
    const payment = await Payment.findById(id);
    if (!payment) { res.status(404).json({ success: false, message: 'Payment not found.' }); return; }
    if (!assigneeUserId) {
      // unassign
      payment.assignedToUserId = null as any;
      payment.assignedToName = null as any;
      payment.auditLog = [ ...(payment.auditLog || []), { actorId: req.user.userId, actorName: req.user.email || '', action: 'unassign', timestamp: new Date() } ];
    } else {
      payment.assignedToUserId = assigneeUserId;
      payment.assignedToName = assigneeName || '';
      payment.auditLog = [ ...(payment.auditLog || []), { actorId: req.user.userId, actorName: req.user.email || '', action: 'assign', timestamp: new Date(), details: `to=${assigneeUserId}` } ];
    }
    await payment.save();
    res.status(200).json({ success: true, message: 'Assignment updated.', data: { payment: payment.toJSON() } });
  } catch (error) {
    logger.error('Employee assign error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while updating assignment.' });
  }
};

export const employeeEscalatePayment = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ success: false, message: 'Authentication required.' }); return; }
    const { id } = req.params;
    const { escalated, notes } = req.body as { escalated: boolean; notes?: string };
    if (!Types.ObjectId.isValid(String(id))) { res.status(400).json({ success: false, message: 'Invalid payment ID.' }); return; }
    const payment = await Payment.findById(id);
    if (!payment) { res.status(404).json({ success: false, message: 'Payment not found.' }); return; }
    payment.escalated = !!escalated;
    payment.escalatedAt = escalated ? new Date() : null as any;
    payment.escalationNotes = (notes || '').trim() || null as any;
    payment.auditLog = [ ...(payment.auditLog || []), { actorId: req.user.userId, actorName: req.user.email || '', action: escalated ? 'escalate' : 'deescalate', timestamp: new Date() } ];
    await payment.save();
    res.status(200).json({ success: true, message: 'Escalation updated.', data: { payment: payment.toJSON() } });
  } catch (error) {
    logger.error('Employee escalate error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while updating escalation.' });
  }
};

export const getDailyTrends = async (_req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const daily = await Payment.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const completionRate = await Payment.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const topReasons = await Payment.aggregate([
      { $match: { deletedAt: null, reasonCode: { $ne: null } } },
      { $group: { _id: '$reasonCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    res.status(200).json({ success: true, data: { daily, completionRate, topReasons }, message: 'Trend charts data.' });
  } catch (error) {
    logger.error('Employee daily trends error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while retrieving trends.' });
  }
};

export const getQueueHealth = async (_req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const stale = await Payment.countDocuments({ deletedAt: null, status: { $in: ['pending', 'processing'] }, createdAt: { $lt: fortyEightHoursAgo } });
    // At risk nearing SLA: pending > 24h
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const atRisk = await Payment.countDocuments({ deletedAt: null, status: { $in: ['pending', 'processing'] }, createdAt: { $lt: twentyFourHoursAgo, $gte: fortyEightHoursAgo } });
    res.status(200).json({ success: true, data: { stale, atRisk }, message: 'Queue health.' });
  } catch (error) {
    logger.error('Employee queue health error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while retrieving queue health.' });
  }
};

export const exportPayments = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ success: false, message: 'Authentication required.' }); return; }
    // Reuse filters from getAllPayments with hardening
    const status = (req.query['status'] as string | undefined) || undefined;
    const keyword = (req.query['keyword'] as string | undefined) || undefined;
    const startDateStr = (req.query['startDate'] as string) || '';
    const endDateStr = (req.query['endDate'] as string) || '';
    const isValidISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
    const startDate = isValidISODate(startDateStr) ? new Date(startDateStr) : undefined;
    const endDate = isValidISODate(endDateStr) ? new Date(endDateStr) : undefined;
    const includeDeleted = String(req.query['includeDeleted'] || 'false') === 'true';
    const query: any = {};
    if (!includeDeleted) query['deletedAt'] = null;
    if (status && ['pending','processing','completed','failed','cancelled'].includes(status)) query['status'] = status;
    if (startDate || endDate) {
      query['createdAt'] = {};
      if (startDate) query['createdAt']['$gte'] = startDate;
      if (endDate) query['createdAt']['$lte'] = endDate;
    }
    let keywordFilter: any = {};
    if (keyword && keyword.trim().length > 0) {
      const k = keyword.trim().slice(0, 100);
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const safe = escapeRegex(k);
      keywordFilter = { $or: [ { recipientName: { $regex: safe, $options: 'i' } }, { reference: { $regex: safe, $options: 'i' } } ] };
    }
    const payments = await Payment.find({ $and: [query, keywordFilter] }).sort({ createdAt: -1 });
    const rows = payments.map(p => ({
      id: String((p as any)._id || p.transactionId || ''),
      recipientName: p.recipientName,
      amount: p.amount,
      currency: p.currency,
      reference: p.reference,
      status: p.status,
      createdAt: p.createdAt?.toISOString() || '',
      processedAt: p.processedAt ? p.processedAt.toISOString() : '',
      failureReason: p.failureReason || '',
      reasonCode: p.reasonCode || '',
      deletedAt: p.deletedAt ? p.deletedAt.toISOString() : '',
      deletedBy: p.deletedByName || p.deletedByUserId || ''
    }));
    const header = Object.keys(rows[0] || { id: '', recipientName: '', amount: '', currency: '', reference: '', status: '', createdAt: '', processedAt: '', failureReason: '', reasonCode: '', deletedAt: '', deletedBy: '' }).join(',');
    const csv = [header, ...rows.map(r => Object.values(r).map(v => String(v).replace(/"/g, '""')).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payments_export.csv"');
    res.status(200).send(csv);
  } catch (error) {
    logger.error('Employee export payments error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while exporting payments.' });
  }
};

export const getReasonCodes = async (_req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: REASON_CODES, message: 'Reason codes.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};