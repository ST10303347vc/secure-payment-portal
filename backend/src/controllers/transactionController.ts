import { Response } from 'express';
import { Payment } from '../models/Payment';
import { IAuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

/**
 * Get transaction history for user
 */
export const getTransactionHistory = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const pageRaw = (req.query['page'] as string) || '1';
    const limitRaw = (req.query['limit'] as string) || '20';
    const page = Math.max(1, Math.min(1000, parseInt(pageRaw, 10) || 1));
    const limit = Math.max(1, Math.min(100, parseInt(limitRaw, 10) || 20));
    const status = req.query['status'] as string;
    const startDate = req.query['startDate'] as string;
    const endDate = req.query['endDate'] as string;
    const skip = (page - 1) * limit;

    // Build query filter
    const filter: any = { userId: req.user.userId };

    if (status && ['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    const isValidISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

    if ((startDate && isValidISODate(startDate)) || (endDate && isValidISODate(endDate))) {
      filter.createdAt = {};
      if (startDate && isValidISODate(startDate)) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate && isValidISODate(endDate)) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Get transactions
    const transactions = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select('-__v');

    // Get total count for pagination
    const total = await Payment.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    // Calculate summary statistics
    const summary = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
          statusBreakdown: {
            $push: {
              status: '$status',
              amount: '$amount',
            },
          },
        },
      },
    ]);

    // Process status breakdown
    let statusStats = {};
    if (summary.length > 0) {
      statusStats = summary[0].statusBreakdown.reduce((acc: any, item: any) => {
        if (!acc[item.status]) {
          acc[item.status] = { count: 0, totalAmount: 0 };
        }
        acc[item.status].count += 1;
        acc[item.status].totalAmount += item.amount;
        return acc;
      }, {});
    }

    res.status(200).json({
      success: true,
      message: 'Transaction history retrieved successfully.',
      data: {
        transactions,
        summary: summary.length > 0 ? {
          totalAmount: summary[0].totalAmount || 0,
          totalTransactions: summary[0].totalTransactions || 0,
          avgAmount: summary[0].avgAmount || 0,
          statusBreakdown: statusStats,
        } : {
          totalAmount: 0,
          totalTransactions: 0,
          avgAmount: 0,
          statusBreakdown: {},
        },
      },
      pagination: {
        page,
        limit,
        total,
        pages,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving transaction history.',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get transaction details by ID
 */
export const getTransactionDetails = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
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

    // Validate ObjectId before querying
    const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(String(id));
    if (!isValidObjectId) {
      res.status(400).json({
        success: false,
        message: 'Invalid transaction ID.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const transaction = await Payment.findOne({
      _id: id,
      userId: req.user.userId,
    }).select('-__v');

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Transaction details retrieved successfully.',
      data: {
        transaction: transaction.toJSON(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Get transaction details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving transaction details.',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Export transaction history to CSV format
 */
export const exportTransactionHistory = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const startDate = req.query['startDate'] as string;
    const endDate = req.query['endDate'] as string;
    const status = req.query['status'] as string;

    // Build query filter
    const filter: any = { userId: req.user.userId };

    if (status && ['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    const isValidISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
    if ((startDate && isValidISODate(startDate)) || (endDate && isValidISODate(endDate))) {
      filter.createdAt = {};
      if (startDate && isValidISODate(startDate)) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate && isValidISODate(endDate)) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Get all transactions matching filter
    const transactions = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .select('-__v');

    // Generate CSV content
    const csvHeaders = [
      'Transaction ID',
      'Date',
      'Recipient Name',
      'Recipient IBAN',
      'Amount',
      'Currency',
      'Status',
      'Reference',
      'Purpose',
    ];

    const csvRows = transactions.map(transaction => [
      transaction.transactionId,
      transaction.createdAt ? transaction.createdAt.toISOString().split('T')[0] : '',
      transaction.recipientName,
      transaction.recipientIBAN,
      transaction.amount.toString(),
      transaction.currency,
      transaction.status,
      transaction.reference,
      transaction.purpose,
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(',')),
    ].join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`);

    res.status(200).send(csvContent);

    // Log export activity
    logger.info('Transaction history exported:', {
      userId: req.user.userId,
      transactionCount: transactions.length,
      filters: { status, startDate, endDate },
      ip: req.ip,
    });
  } catch (error) {
    logger.error('Export transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while exporting transaction history.',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get monthly transaction summary
 */
export const getMonthlyTransactionSummary = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const year = parseInt(req.query['year'] as string) || new Date().getFullYear();

    // Get monthly summary for the specified year
    const monthlySummary = await Payment.aggregate([
      {
        $match: {
          userId: req.user.userId,
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lt: new Date(`${year + 1}-01-01`),
          },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            status: '$status',
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $group: {
          _id: '$_id.month',
          transactions: {
            $push: {
              status: '$_id.status',
              count: '$count',
              totalAmount: '$totalAmount',
            },
          },
          totalCount: { $sum: '$count' },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Format the data for easier consumption
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const formattedSummary = monthlySummary.map(month => ({
      month: monthNames[month._id - 1],
      monthNumber: month._id,
      totalTransactions: month.totalCount,
      totalAmount: month.totalAmount,
      byStatus: month.transactions.reduce((acc: any, item: any) => {
        acc[item.status] = {
          count: item.count,
          totalAmount: item.totalAmount,
        };
        return acc;
      }, {}),
    }));

    res.status(200).json({
      success: true,
      message: 'Monthly transaction summary retrieved successfully.',
      data: {
        year,
        summary: formattedSummary,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Get monthly transaction summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving monthly summary.',
      timestamp: new Date().toISOString(),
    });
  }
};