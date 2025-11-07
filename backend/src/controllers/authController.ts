import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';
import { IUserRegistration, IUserLogin, IAuthenticatedRequest } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
// Email verification disabled: no verification emails are sent

// TODO: Add rate limiting for registration attempts
// TODO: Implement email verification with proper templates
// FIXME: Password validation could be more robust
// Note to self: maybe add 2FA later?

/**
 * Generate JWT token
 */
const generateToken = (userId: string, email: string, role: 'customer' | 'employee'): string => {
  const payload = { userId, email, role };
  const secret = config.jwtSecret;
  const options: jwt.SignOptions = { expiresIn: config.jwtExpiresIn as any };
  
  return jwt.sign(payload, secret, options);
};

// Email verification disabled: omit verification token generation

/**
 * Register new user
 * This was a pain to get working with Firebase...
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
    }: IUserRegistration = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !password || !phone) {
      res.status(400).json({
        success: false,
        message: 'All fields are required.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Normalize and bound email length to avoid ReDoS on regex
    const normalizedEmail = String(email).trim().toLowerCase();
    if (normalizedEmail.length === 0 || normalizedEmail.length > 254) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    // Email validation (bounded regex)
    const emailRegex = /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,190}\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Password validation 
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Phone validation with bounded length
    const normalizedPhone = String(phone).trim();
    const phoneRegex = /^\+?[\d\s\-\(\)]{7,32}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(normalizedEmail);
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'User with this email already exists.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Email verification disabled: no verification token generation

    // Generate unique account number 
    let accountNumber: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    // TODO: This could be optimized with a better algorithm
    // Maybe use UUID instead?
    while (!isUnique && attempts < maxAttempts) {
      const prefix = 'ACC';
      const timestamp = Date.now().toString().slice(-8);
      const random = crypto.randomBytes(4).toString('hex').toUpperCase();
      accountNumber = `${prefix}${timestamp}${random}`;
      
      const existingAccount = await User.findByAccountNumber(accountNumber);
      if (!existingAccount) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      res.status(500).json({
        success: false,
        message: 'Unable to generate unique account number. Please try again.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Create user
    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password,
      phone: normalizedPhone,
      accountNumber: accountNumber!,
      role: 'customer' as const,
      // Email verification disabled: mark users verified by default
      isVerified: true,
      isActive: true,
    };

    const user = await User.create(userData);

    // Email verification disabled: skip token persistence and email sending

    // Log successful registration
    logger.info('User registered successfully:', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Return success response (exclude sensitive data)
    const userResponse = User.toJSON(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: userResponse,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration.',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: IUserLogin = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Find user by email (include password for comparison)
    const user = await User.findByEmail(email.toLowerCase());
    
    if (!user) {
      // Log failed login attempt
    logger.warn('Login attempt with non-existent email:', {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if account is locked
    if (User.isLocked(user)) {
      res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if account is active and verified
    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Email verification disabled: allow login regardless of verification status

    // Compare password
    const isPasswordValid = await User.comparePassword(user, password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await User.incrementLoginAttempts(user.id!);

      // Log failed login attempt
      logger.warn('Failed login attempt:', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        loginAttempts: (user.loginAttempts || 0) + 1,
      });

      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Reset login attempts on successful login
    if ((user.loginAttempts || 0) > 0) {
      await User.resetLoginAttempts(user.id!);
    }

    // Update last login
    await User.updateLastLogin(user.id!);

    // Generate JWT token
    const token = generateToken(user.id!, user.email, (user as any).role || 'customer');

    // Log successful login
    logger.info('User logged in successfully:', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Return success response (exclude password)
    const userResponse = User.toJSON(user);
    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: userResponse,
        token,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login.',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Logout user (client-side token invalidation)
 */
export const logout = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // In a stateless JWT system, logout is typically handled client-side
    // by removing the token from storage. However, we can log the logout event.
    
    if (req.user) {
      logger.info('User logged out:', {
        userId: req.user.userId,
        email: req.user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout.',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const user = await User.findById(req.user.userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully.',
      data: {
        user: User.toJSON(user),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving profile.',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { firstName, lastName, phone } = req.body;
    const allowedUpdates = ['firstName', 'lastName', 'phone'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      res.status(400).json({
        success: false,
        message: 'Invalid updates. Only firstName, lastName, and phone can be updated.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const user = await User.findById(req.user.userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Update allowed fields
    const updateData: any = {};
    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (phone) updateData.phone = phone.trim();

    const updatedUser = await User.updateById(req.user.userId, updateData);

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.info('User profile updated:', {
      userId: updatedUser.id,
      email: updatedUser.email,
      updatedFields: updates,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: User.toJSON(updatedUser),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Update profile error:', error);

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
      message: 'Internal server error while updating profile.',
      timestamp: new Date().toISOString(),
    });
  }
};
/**
 * Verify email using token
 */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    // prevent TypeScript unused parameter error
    void req;
    // Email verification disabled: endpoint retained for compatibility
    res.status(200).json({
      success: true,
      message: 'Email verification is disabled. Accounts are auto-verified.',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Email verification error:', err as any);
    res.status(500).json({
      success: false,
      message: 'Internal server error during email verification.',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Resend verification email
 */
export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    // prevent TypeScript unused parameter error
    void req;
    // Email verification disabled: endpoint retained for compatibility
    res.status(200).json({
      success: true,
      message: 'Verification is disabled. Your account is already active.',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Resend verification error:', err as any);
    res.status(500).json({
      success: false,
      message: 'Internal server error while resending verification.',
      timestamp: new Date().toISOString(),
    });
  }
};