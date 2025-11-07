import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import xss from 'xss';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
};

/**
 * Rate limiting configuration
 */
export const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        success: false,
        message,
        timestamp: new Date().toISOString(),
      });
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    },
  });
};

// General rate limiting
export const generalRateLimit = createRateLimit(
  config.rateLimitWindowMs,
  config.rateLimitMaxRequests,
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiting for auth endpoints
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per 15 minutes
  'Too many authentication attempts, please try again later.'
);

// Payment rate limiting
export const paymentRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 payments per hour
  'Too many payment requests, please try again later.'
);

/**
 * Step-up confirmation middleware: require explicit confirmation header for destructive actions
 */
export const stepUpConfirmAction = (req: Request, res: Response, next: NextFunction): void => {
  const confirm = req.header('x-action-confirm');
  if (String(confirm || '').toLowerCase() !== 'true') {
    res.status(401).json({ success: false, message: 'Step-up confirmation required for this action.' });
    return;
  }
  next();
};

/**
 * Helmet security configuration
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitize against NoSQL injection attacks
    mongoSanitize.sanitize(req.body);
    mongoSanitize.sanitize(req.query);
    mongoSanitize.sanitize(req.params);

    // Sanitize against XSS attacks
    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }

    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid input data.',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Recursively sanitize object properties against XSS
 */
const sanitizeObject = (obj: any): void => {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        obj[key] = xss(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
};

/**
 * HTTP Parameter Pollution protection
 */
export const hppProtection: any = hpp({
  whitelist: ['sort', 'fields', 'page', 'limit'], // Allow these parameters to be arrays
});

/**
 * Security headers middleware
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length'),
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Error:', logData);
    } else {
      logger.info('HTTP Request:', logData);
    }
  });

  next();
};

/**
 * Error handling middleware for security-related errors
 */
export const securityErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log security-related errors
  logger.error('Security error:', {
    error: error.message,
    stack: error.stack,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
  });

  // Don't expose internal error details
  if (error.message.includes('CORS')) {
    res.status(403).json({
      success: false,
      message: 'Cross-origin request blocked.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Generic security error response
  res.status(500).json({
    success: false,
    message: 'A security error occurred.',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Validate request size middleware
 */
export const validateRequestSize = (req: Request, res: Response, next: NextFunction): void => {
  const contentLength = req.get('Content-Length');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength && parseInt(contentLength) > maxSize) {
    logger.warn(`Request too large: ${contentLength} bytes from IP: ${req.ip}`);
    res.status(413).json({
      success: false,
      message: 'Request entity too large.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};