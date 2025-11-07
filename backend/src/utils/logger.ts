import winston from 'winston';
import path from 'path';

// TODO: Add log rotation for production
// FIXME: Console logging should be disabled in production

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Different log format for console (more readable)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

export const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  format: logFormat,
  defaultMeta: { service: 'payment-portal-api' },
  transports: [
    // Write all logs to console in development
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    }),
    
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      level: 'info'
    }),
    
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error'
    })
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'exceptions.log') 
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'rejections.log') 
    })
  ]
});

// Debug helper for development
export const debugLog = (message: string, data?: any) => {
  if (process.env['NODE_ENV'] === 'development') {
    console.log(`[DEBUG] ${message}`, data || '');
  }
};

// Security logging functions
export const securityLogger = {
  logAuthAttempt: (email: string, success: boolean, ip: string, userAgent: string) => {
    logger.info(`Auth attempt - Email: ${email}, Success: ${success}, IP: ${ip}, UserAgent: ${userAgent}`);
  },
  
  logSuspiciousActivity: (userId: string | undefined, activity: string, ip: string, details?: any) => {
    logger.warn(`Suspicious activity - User: ${userId || 'Unknown'}, Activity: ${activity}, IP: ${ip}, Details: ${JSON.stringify(details)}`);
  },
  
  logSecurityEvent: (event: string, userId?: string, ip?: string, details?: any) => {
    logger.info(`Security event - Event: ${event}, User: ${userId || 'Unknown'}, IP: ${ip || 'Unknown'}, Details: ${JSON.stringify(details)}`);
  },
  
  logRateLimitExceeded: (ip: string, endpoint: string, userAgent: string) => {
    logger.warn(`Rate limit exceeded - IP: ${ip}, Endpoint: ${endpoint}, UserAgent: ${userAgent}`);
  },
  
  logPaymentAttempt: (userId: string, amount: number, currency: string, success: boolean, ip: string) => {
    logger.info(`Payment attempt - User: ${userId}, Amount: ${amount} ${currency}, Success: ${success}, IP: ${ip}`);
  }
};

// Create logs directory
import fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}