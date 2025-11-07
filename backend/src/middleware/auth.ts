import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { IAuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

// TODO: Add token blacklisting for logout
// FIXME: Token expiry handling could be improved

export const authenticate = async (req: IAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No auth header found'); // Debug
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Debug log token verification attempt
    console.log('Verifying token for request:', req.path);
    
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;
    
    console.log('Token verified for user:', decoded.userId); // Debug
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    console.error('Auth middleware error:', error); // Debug log
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token has expired.',
        timestamp: new Date().toISOString(),
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token.',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error during authentication.',
        timestamp: new Date().toISOString(),
      });
    }
  }
};

export const authorizeRole = (allowed: Array<'customer' | 'employee'>) => {
  return (req: IAuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user || !req.user.role) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Missing role.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!allowed.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during authorization.',
        timestamp: new Date().toISOString(),
      });
    }
  };
};