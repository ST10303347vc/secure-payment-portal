import mongoose from 'mongoose';
import { logger } from '../utils/logger';

// TODO: Add connection pooling configuration
// FIXME: Add proper retry logic for connection failures

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/payment-portal';
    
    // Debug: Log connection attempt
    console.log('Attempting to connect to MongoDB...');
    console.log('MongoDB URI:', mongoURI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
    
    const conn = await mongoose.connect(mongoURI, {
      // Connection options
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false // Disable mongoose buffering
    });

    // Debug: Log successful connection
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
    
    logger.info(`MongoDB connected successfully to ${conn.connection.host}`);

    // Connection event listeners for debugging
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB');
      logger.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, closing MongoDB connection...');
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
      process.exit(0);
    });

  } catch (error: any) {
    console.error('Database connection failed:', error.message);
    logger.error('Database connection failed:', error);
    
    // FIXME: Should we exit the process or retry?
    process.exit(1);
  }
};

// Experimental: Connection health check (not implemented yet)
/*
const checkConnectionHealth = async (): Promise<boolean> => {
  try {
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    return false;
  }
};
*/

export default connectDB;