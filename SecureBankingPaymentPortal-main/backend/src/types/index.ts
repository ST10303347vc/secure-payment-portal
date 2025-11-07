import { Request } from 'express';
import mongoose from 'mongoose';

// User interfaces
export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  accountNumber: string;
  role: 'customer' | 'employee';
  isActive: boolean;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  lastLogin?: Date;
  loginAttempts?: number;
  lockUntil?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserRegistration {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  accountNumber: string;
  termsAccepted: boolean;
}

export interface IUserLogin {
  email: string;
  password: string;
}

// Payment interfaces
export interface IPayment {
  userId: mongoose.Types.ObjectId | string;
  recipientName: string;
  recipientEmail: string;
  recipientIBAN: string;
  recipientSWIFT: string;
  recipientAddress: string;
  recipientCity: string;
  recipientCountry: string;
  amount: number;
  currency: string;
  reference: string;
  purpose: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  transactionId: string;
  createdAt?: Date;
  updatedAt?: Date;
  processedAt?: Date;
  failureReason?: string;
}

export interface IPaymentRequest {
  recipientName: string;
  recipientEmail: string;
  recipientIBAN: string;
  recipientSWIFT: string;
  recipientAddress: string;
  recipientCity: string;
  recipientCountry: string;
  amount: string;
  currency: string;
  reference: string;
  purpose: string;
}

// Transaction interfaces
export interface ITransaction {
  userId: string;
  paymentId: string;
  type: 'debit' | 'credit';
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt?: Date;
  updatedAt?: Date;
}

// JWT Types
export interface IJWTPayload {
  userId: string;
  email: string;
  role: 'customer' | 'employee';
  iat?: number;
  exp?: number;
}

export interface IAuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: 'customer' | 'employee';
  };
}

// API Response Types
export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface IPaginatedResponse<T> extends IApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Validation Types
export interface IValidationError {
  field: string;
  message: string;
  value?: any;
}

// Security Types
export interface IRateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

export interface ISecurityLog {
  userId?: string;
  ip: string;
  userAgent: string;
  action: string;
  success: boolean;
  timestamp: Date;
  details?: any;
}

// Configuration Types
export interface IAppConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  frontendUrl: string;
  backendUrl: string;
  allowedOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

// Database Types
export interface IDbConnection {
  isConnected: boolean;
  connectionString: string;
  options: any;
}

// Email Types
export interface IEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  context?: any;
}

// Audit log interfaces
export interface IAuditLog {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ip: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}