import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { IAppConfig } from '../types';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'CSRF_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Application configuration
export const config: IAppConfig = {
  port: parseInt(process.env['PORT'] || '5001', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  mongoUri: process.env['MONGODB_URI'] || 'mongodb://localhost:27017/secure_payment_portal',
  jwtSecret: process.env['JWT_SECRET'] as string,
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
  frontendUrl: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  backendUrl: process.env['API_BASE_URL'] || process.env['BACKEND_URL'] || `http://localhost:${process.env['PORT'] || '5001'}`,
  allowedOrigins: (process.env['ALLOWED_ORIGINS'] || 'http://localhost:3000').split(','),
  rateLimitWindowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
};

// Security configuration
export const securityConfig = {
  jwtSecret: process.env['JWT_SECRET'] as string,
  jwtRefreshSecret: process.env['JWT_REFRESH_SECRET'] as string,
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
  jwtRefreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
  encryptionKey: process.env['ENCRYPTION_KEY'] as string,
  encryptionIv: process.env['ENCRYPTION_IV'] || 'defaultiv1234567',
  csrfSecret: process.env['CSRF_SECRET'] as string,
  bcryptRounds: 12,
  maxLoginAttempts: 5,
  lockoutTime: 30 * 60 * 1000, // 30 minutes
};

// Database configuration
export const dbConfig = {
  uri: process.env['MONGODB_URI'] || 'mongodb://localhost:27017/secure_payment_portal',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferMaxEntries: 0,
    bufferCommands: false,
    retryWrites: true,
    w: 'majority' as const,
    readPreference: 'primary' as const,
    ssl: process.env['NODE_ENV'] === 'production',
    sslValidate: process.env['NODE_ENV'] === 'production',
    authSource: 'admin',
  },
};

// CORS configuration
export const corsConfig = {
  origin: config.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token',
    'X-Forwarded-For',
    'User-Agent'
  ],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 86400, // 24 hours
};

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: any) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
};

// Validation configuration
export const validationConfig = {
  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  
  // Payment limits
  payment: {
    minAmount: 1.00,
    maxAmount: 50000.00,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD', 'ZAR', 'BRL', 'INR', 'KRW', 'PLN'],
  },
  
  // Input length limits
  inputLimits: {
    name: { min: 2, max: 50 },
    email: { min: 5, max: 100 },
    phone: { min: 10, max: 20 },
    address: { min: 10, max: 200 },
    reference: { min: 3, max: 100 },
    accountNumber: { min: 8, max: 20 },
  },
};

// Email configuration
export const emailConfig = {
  smtp: {
    host: process.env['SMTP_HOST'] || 'smtp.gmail.com',
    port: parseInt(process.env['SMTP_PORT'] || '587', 10),
    secure: false,
    auth: {
      user: process.env['SMTP_USER'],
      pass: process.env['SMTP_PASS'],
    },
  },
  from: process.env['SMTP_USER'] || 'noreply@securepayportal.com',
  templates: {
    welcome: 'welcome',
    passwordReset: 'password-reset',
    paymentConfirmation: 'payment-confirmation',
    securityAlert: 'security-alert',
  },
};

// Logging configuration
export const logConfig = {
  level: process.env['LOG_LEVEL'] || 'info',
  file: process.env['LOG_FILE'] || 'logs/app.log',
  maxSize: '20m',
  maxFiles: '14d',
  datePattern: 'YYYY-MM-DD',
};

export default config;