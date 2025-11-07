import { Router } from 'express';
import {
  getTransactionHistory,
  getTransactionDetails,
  exportTransactionHistory,
  getMonthlyTransactionSummary,
} from '../controllers/transactionController';
import { authenticate } from '../middleware/auth';

const router: any = Router();

/**
 * @route   GET /api/transactions
 * @desc    Get transaction history with filtering and pagination
 * @access  Private
 */
router.get('/', authenticate, getTransactionHistory);

/**
 * @route   GET /api/transactions/export
 * @desc    Export transaction history to CSV
 * @access  Private
 */
router.get('/export', authenticate, exportTransactionHistory);

/**
 * @route   GET /api/transactions/monthly-summary
 * @desc    Get monthly transaction summary
 * @access  Private
 */
router.get('/monthly-summary', authenticate, getMonthlyTransactionSummary);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get transaction details by ID
 * @access  Private
 */
router.get('/:id', authenticate, getTransactionDetails);

export default router;