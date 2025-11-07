import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { initializeFirebase } from './config/firebase';
import { logger } from './utils/logger';
import connectDB from './config/database';

// Import middleware
import {
  corsOptions,
  generalRateLimit,
  hppProtection,
  sanitizeInput,
  securityHeaders,
  requestLogger,
  securityErrorHandler,
  validateRequestSize,
} from './middleware/security';

// Import routes
import authRoutes from './routes/auth';
import paymentRoutes from './routes/payment';
import employeeRoutes from './routes/employee';
import validationRoutes from './routes/validation';
import transactionRoutes from './routes/transaction';

// Create Express app
const app: Application = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());

// Rate limiting
app.use(generalRateLimit);

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(validateRequestSize);
app.use(sanitizeInput);
app.use(hppProtection);
app.use(securityHeaders);
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payment Portal API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/validate', validationRoutes);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(securityErrorHandler);

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server function
export const startServer = async (): Promise<void> => {
  try {
    // Initialize databases
    await initializeFirebase();
    await connectDB();
    
    // Start server
    const PORT = config.port || 5001;
    console.log('Using port:', PORT, 'from config.port:', config.port);
    app.listen(PORT, () => {
      logger.info(`Payment Portal API server running on port ${PORT}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Firebase: Initialized`);
      logger.info(`MongoDB: Connected`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

export default app;