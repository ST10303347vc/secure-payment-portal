import { Response } from 'express';
import { Payment } from '../models/Payment';
import { IAuthenticatedRequest, IPaymentRequest } from '../types';
import { logger } from '../utils/logger';
import { validateIBAN, validateSWIFT, validateCurrency } from '../utils/validation';

/**
 * Create a new payment
 */
export const createPayment = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const {
      recipientName,
      recipientEmail,
      recipientIBAN,
      recipientSWIFT,
      recipientAddress,
      recipientCity,
      recipientCountry,
      amount,
      currency,
      reference,
      purpose,
    }: IPaymentRequest = req.body;

    // Collect validation errors
    const errors: { field: string; message: string }[] = [];

    // Validate required fields (collect all missing)
    const requiredFields = [
      'recipientName', 'recipientEmail', 'recipientIBAN', 'recipientSWIFT',
      'recipientAddress', 'recipientCity', 'recipientCountry',
      'amount', 'currency', 'reference', 'purpose'
    ];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        errors.push({ field, message: `${field} is required.` });
      }
    }

    // Validate IBAN format
    if (recipientIBAN && !validateIBAN(recipientIBAN)) {
      errors.push({ field: 'recipientIBAN', message: 'Invalid IBAN format' });
    }

    // Validate SWIFT code format
    if (recipientSWIFT && !validateSWIFT(recipientSWIFT)) {
      errors.push({ field: 'recipientSWIFT', message: 'Invalid SWIFT code format' });
    }

    // Validate amount
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      errors.push({ field: 'amount', message: 'Amount must be a positive number.' });
    } else if (numericAmount > 1000000) {
      errors.push({ field: 'amount', message: 'Amount cannot exceed 1,000,000.' });
    }

    // Validate currency code
    if (currency && !validateCurrency(currency)) {
      errors.push({ field: 'currency', message: 'Unsupported currency code.' });
    }

    // If any validation errors, return all
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Create payment
    const payment = new Payment({
      userId: req.user.userId,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.toLowerCase().trim(),
      recipientIBAN: recipientIBAN.toUpperCase().replace(/\s/g, ''),
      recipientSWIFT: recipientSWIFT.toUpperCase().trim(),
      recipientAddress: recipientAddress.trim(),
      recipientCity: recipientCity.trim(),
      recipientCountry: recipientCountry.trim(),
      amount: numericAmount,
      currency: currency.toUpperCase(),
      reference: reference.trim(),
      purpose: purpose.trim(),
      status: 'pending',
    });

    await payment.save();

    // Log payment creation
    logger.info('Payment created:', {
      paymentId: payment._id,
      userId: req.user.userId,
      amount: numericAmount,
      currency: currency.toUpperCase(),
      recipientIBAN: recipientIBAN.substring(0, 8) + '****', // Mask IBAN for logging
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Payment created successfully.',
      data: {
        payment: payment.toJSON(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Create payment error:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
      }));

      res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: validationErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while creating payment.',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get user's payments
 */
export const getPayments = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 10;
    const skip = (page - 1) * limit;

    // Get payments for the authenticated user
    const payments = await Payment.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    // Get total count for pagination
    const total = await Payment.countDocuments({ userId: req.user.userId });
    const pages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      message: 'Payments retrieved successfully.',
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving payments.',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get payment by ID
 */
export const getPaymentById = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { id } = req.params;

    const payment = await Payment.findOne({
      _id: id,
      userId: req.user.userId, // Ensure user can only access their own payments
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Payment retrieved successfully.',
      data: {
        payment: payment.toJSON(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Get payment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving payment.',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Cancel payment (only if status is pending)
 */
export const cancelPayment = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { id } = req.params;

    const payment = await Payment.findOne({
      _id: id,
      userId: req.user.userId,
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (payment.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'Only pending payments can be cancelled.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Update payment status
    payment.status = 'cancelled';
    await payment.save();

    // Log payment cancellation
    logger.info('Payment cancelled:', {
      paymentId: payment._id,
      userId: req.user.userId,
      transactionId: payment.transactionId,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Payment cancelled successfully.',
      data: {
        payment: payment.toJSON(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cancel payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while cancelling payment.',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get payment statistics for user
 */
export const getPaymentStats = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Get payment statistics
    const stats = await Payment.aggregate([
      { $match: { userId: req.user.userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    // Get total payments count
    const totalPayments = await Payment.countDocuments({ userId: req.user.userId });

    // Format statistics
    const formattedStats = {
      totalPayments,
      byStatus: stats.reduce((acc: any, stat: any) => {
        acc[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount,
        };
        return acc;
      }, {}),
    };

    res.status(200).json({
      success: true,
      message: 'Payment statistics retrieved successfully.',
      data: formattedStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving payment statistics.',
      timestamp: new Date().toISOString(),
    });
  }
};