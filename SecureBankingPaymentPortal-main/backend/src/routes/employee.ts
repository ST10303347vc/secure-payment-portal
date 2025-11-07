import { Router } from 'express';
import { authenticate, authorizeRole } from '../middleware/auth';
import { paymentRateLimit, stepUpConfirmAction } from '../middleware/security';
import { getAllPayments, getGlobalPaymentStats, employeeCancelPayment, employeeValidatePayment, employeeRejectPayment, employeeUpdateReason, employeeDeletePayment, employeeRestorePayment, employeeBulkAction, employeeAddNote, getPaymentAudit, employeeAssignPayment, employeeEscalatePayment, getDailyTrends, getQueueHealth, exportPayments, getReasonCodes } from '../controllers/employeeController';

const router: any = Router();

// Employee: list all payments
router.get('/payments', authenticate, authorizeRole(['employee']), getAllPayments);

// Employee: global stats
router.get('/payments/stats', authenticate, authorizeRole(['employee']), getGlobalPaymentStats);

// Trends & queue health
router.get('/payments/trends', authenticate, authorizeRole(['employee']), getDailyTrends);
router.get('/payments/queue-health', authenticate, authorizeRole(['employee']), getQueueHealth);
router.get('/payments/export', authenticate, authorizeRole(['employee']), exportPayments);
router.get('/reasons', authenticate, authorizeRole(['employee']), getReasonCodes);

// Employee: cancel any payment
router.put('/payments/:id/cancel', authenticate, authorizeRole(['employee']), paymentRateLimit, employeeCancelPayment);
// Support POST cancel for frontend compatibility
router.post('/payments/:id/cancel', authenticate, authorizeRole(['employee']), paymentRateLimit, employeeCancelPayment);

// Employee: validate a payment
router.put('/payments/:id/validate', authenticate, authorizeRole(['employee']), paymentRateLimit, employeeValidatePayment);

// Employee: reject a payment with reason
router.put('/payments/:id/reject', authenticate, authorizeRole(['employee']), paymentRateLimit, employeeRejectPayment);

// Employee: update failure/cancellation reason
router.put('/payments/:id/reason', authenticate, authorizeRole(['employee']), employeeUpdateReason);

// Employee: delete payment (allowed statuses only)
router.delete('/payments/:id', authenticate, authorizeRole(['employee']), stepUpConfirmAction, employeeDeletePayment);

// Restore from Trash
router.put('/payments/:id/restore', authenticate, authorizeRole(['employee']), employeeRestorePayment);

// Bulk actions
router.post('/payments/bulk', authenticate, authorizeRole(['employee']), stepUpConfirmAction, employeeBulkAction);

// Notes & Audit
router.post('/payments/:id/notes', authenticate, authorizeRole(['employee']), employeeAddNote);
router.get('/payments/:id/audit', authenticate, authorizeRole(['employee']), getPaymentAudit);

// Assignment & Escalation
router.put('/payments/:id/assign', authenticate, authorizeRole(['employee']), employeeAssignPayment);
router.put('/payments/:id/escalate', authenticate, authorizeRole(['employee']), employeeEscalatePayment);

export default router;