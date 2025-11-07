import { Router } from 'express';
import {
  createPayment,
  getPayments,
  getPaymentById,
  cancelPayment,
  getPaymentStats,
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { paymentRateLimit } from '../middleware/security';

const router: any = Router();

/**
 * @route   POST /api/payments
 * @desc    Create a new payment
 * @access  Private
 */
router.post('/', authenticate, paymentRateLimit, createPayment);

/**
 * @route   GET /api/payments
 * @desc    Get user's payments with pagination
 * @access  Private
 */
router.get('/', authenticate, getPayments);

/**
 * @route   GET /api/payments/stats
 * @desc    Get payment statistics for user
 * @access  Private
 */
router.get('/stats', authenticate, getPaymentStats);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 * @access  Private
 */
router.get('/:id', authenticate, getPaymentById);

/**
 * @route   PUT /api/payments/:id/cancel
 * @desc    Cancel a payment
 * @access  Private
 */
router.put('/:id/cancel', authenticate, paymentRateLimit, cancelPayment);

export default router;