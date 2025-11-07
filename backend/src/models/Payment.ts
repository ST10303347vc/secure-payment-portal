import mongoose, { Document, Schema } from 'mongoose';
import { validateIBAN, validateSWIFT } from '../utils/validation';

// TODO: Add payment categories (personal, business, etc.)
// FIXME: Consider adding payment limits per user type

export interface IPayment extends Document {
  userId: string;
  recipientName: string;
  recipientIBAN: string;
  recipientSWIFT: string;
  amount: number;
  currency: string;
  reference: string;
  purpose: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  failureReason?: string;

  // Soft-delete
  deletedAt?: Date | null;
  deletedByUserId?: string | null;
  deletedByName?: string | null;

  // Assignment
  assignedToUserId?: string | null;
  assignedToName?: string | null;

  // Notes and mentions
  notes?: Array<{
    text: string;
    authorId: string;
    authorName?: string;
    createdAt: Date;
    mentions?: Array<{ userId: string; name?: string }>;
  }>;

  // Audit log
  auditLog?: Array<{
    actorId: string;
    actorName?: string;
    action: string;
    timestamp: Date;
    details?: string;
  }>;

  // Reason taxonomy and escalation
  reasonCode?: string | null;
  escalated?: boolean;
  escalatedAt?: Date | null;
  escalationNotes?: string | null;

  // Methods
  updateStatus(status: string): Promise<IPayment>;
}

const PaymentSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  recipientName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  recipientIBAN: {
    type: String,
    required: true,
    uppercase: true,
    validate: {
      validator: function(v: string) {
        // Use shared IBAN validation utility for consistency
        return validateIBAN((v || '').replace(/\s/g, '').toUpperCase());
      },
      message: 'Invalid IBAN format'
    }
  },
  recipientSWIFT: {
    type: String,
    required: true,
    uppercase: true,
    validate: {
      validator: function(v: string) {
        // Use shared SWIFT validation utility for consistency
        return validateSWIFT((v || '').replace(/\s/g, '').toUpperCase());
      },
      message: 'Invalid SWIFT code format'
    }
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount must be greater than 0'],
    max: [1000000, 'Amount exceeds maximum limit'] // TODO: Make this configurable
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD', 'ZAR', 'BRL', 'INR', 'KRW', 'PLN']
  },
  reference: {
    type: String,
    required: true,
    trim: true,
    maxlength: 140
  },
  purpose: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  processedAt: {
    type: Date,
    default: null
  },
  failureReason: {
    type: String,
    default: null,
    maxlength: 500
  },
  // Soft-delete fields
  deletedAt: {
    type: Date,
    default: null,
    index: true
  },
  deletedByUserId: {
    type: String,
    default: null
  },
  deletedByName: {
    type: String,
    default: null
  },
  // Assignment
  assignedToUserId: {
    type: String,
    default: null,
    index: true
  },
  assignedToName: {
    type: String,
    default: null
  },
  // Notes
  notes: [
    new Schema({
      text: { type: String, required: true, maxlength: 1000 },
      authorId: { type: String, required: true },
      authorName: { type: String, default: null },
      createdAt: { type: Date, default: () => new Date() },
      mentions: [
        new Schema({
          userId: { type: String, required: true },
          name: { type: String, default: null }
        }, { _id: false })
      ]
    }, { _id: false })
  ],
  // Audit log entries
  auditLog: [
    new Schema({
      actorId: { type: String, required: true },
      actorName: { type: String, default: null },
      action: { type: String, required: true },
      timestamp: { type: Date, default: () => new Date() },
      details: { type: String, default: null, maxlength: 1000 }
    }, { _id: false })
  ],
  // Reason taxonomy and escalation
  reasonCode: {
    type: String,
    default: null,
    maxlength: 100
  },
  escalated: {
    type: Boolean,
    default: false,
    index: true
  },
  escalatedAt: {
    type: Date,
    default: null
  },
  escalationNotes: {
    type: String,
    default: null,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Debug: Log payment creation
PaymentSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log('Creating new payment:', this.toObject());
  }
  next();
});

// Instance method to update payment status
PaymentSchema.methods['updateStatus'] = function(newStatus: string): Promise<IPayment> {
  this['status'] = newStatus;
  
  // Debug logging
  console.log(`Payment ${this['_id']} status updated to: ${newStatus}`);
  
  return this['save']();
};

// Static method to find payments by user
PaymentSchema.statics['findByUser'] = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method to find payments by status
PaymentSchema.statics['findByStatus'] = function(status: string) {
  return this.find({ status });
};

// Static method to get payment statistics
PaymentSchema.statics['getStats'] = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

// Experimental: Payment validation middleware (commented out for now)
/*
PaymentSchema.pre('validate', function(next) {
  // Additional business logic validation
  if (this.amount > 50000 && this.purpose === 'personal') {
    return next(new Error('Large personal transfers require additional verification'));
  }
  next();
});
*/

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);