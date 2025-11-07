import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import { IUser } from '../types';
import { securityConfig } from '../config';
import { getFirestoreDb } from '../config/firebase';

export interface IUserDocument extends IUser {
  id?: string;
}

export class User {
  // get Firestore instance
  private static getDb() {
    return getFirestoreDb();
  }

  static async create(userData: Omit<IUser, 'createdAt' | 'updatedAt'>): Promise<IUserDocument> {
    try {
      const db = this.getDb();
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const userDoc: any = {
         ...userData,
         password: hashedPassword,
         createdAt: new Date(),
         updatedAt: new Date(),
         isActive: true,
         // Email verification disabled: create users as verified
         isVerified: true,
         loginAttempts: 0,
       };

      const docRef = await db.collection('users').add(userDoc);
      
      logger.info('User created successfully:', { userId: docRef.id, email: userData.email });
      
      return { id: docRef.id, ...userDoc };
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  static async findById(id: string): Promise<IUserDocument | null> {
    try {
      const db = this.getDb();
      const doc = await db.collection('users').doc(id).get();
      
      if (!doc.exists) {
        return null;
      }
      
      const data = doc.data();
      if (!data) {
        return null;
      }
      
      return { id: doc.id, ...data } as IUserDocument;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByEmail(email: string): Promise<IUserDocument | null> {
    try {
      const db = this.getDb();
      const usersRef = db.collection('users');
      const snapshot = await usersRef.where('email', '==', email).get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      if (!doc || !doc.data()) {
        return null;
      }
      
      const data = doc.data();
      return { id: doc.id, ...data } as IUserDocument;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findByAccountNumber(accountNumber: string): Promise<IUserDocument | null> {
    try {
      const db = this.getDb();
      const usersRef = db.collection('users');
      const snapshot = await usersRef.where('accountNumber', '==', accountNumber).get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      if (!doc || !doc.data()) {
        return null;
      }
      
      const data = doc.data();
      return { id: doc.id, ...data } as IUserDocument;
    } catch (error) {
      logger.error('Error finding user by account number:', error);
      throw error;
    }
  }

  static async updateById(id: string, updateData: Partial<IUser>): Promise<IUserDocument | null> {
    try {
      const db = this.getDb();
      const docRef = db.collection('users').doc(id);
      
      const updatePayload = {
        ...updateData,
        updatedAt: new Date(),
      };
      
      await docRef.update(updatePayload);
      
      // Return updated document
      const updatedDoc = await docRef.get();
      if (!updatedDoc.exists) {
        return null;
      }
      
      const data = updatedDoc.data();
      return { id: updatedDoc.id, ...data } as IUserDocument;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  static async deleteById(id: string): Promise<boolean> {
    try {
      const db = this.getDb();
      await db.collection('users').doc(id).delete();
      
      logger.info('User deleted successfully:', { userId: id });
      return true;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  static async comparePassword(user: IUserDocument, candidatePassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(candidatePassword, user.password);
    } catch (error) {
      logger.error('Error comparing password:', error);
      return false;
    }
  }

  static isLocked(user: IUserDocument): boolean {
    return !!(user.lockUntil && user.lockUntil > new Date());
  }

  static async incrementLoginAttempts(userId: string): Promise<void> {
    try {
      const db = this.getDb();
      const docRef = db.collection('users').doc(userId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        throw new Error('User not found');
      }
      
      const userData = doc.data() as IUserDocument;
      const loginAttempts = (userData.loginAttempts || 0) + 1;
      
      const updateData: any = {
        loginAttempts,
        updatedAt: new Date(),
      };
      
      // Lock account if max attempts reached
      if (loginAttempts >= securityConfig.maxLoginAttempts) {
        updateData.lockUntil = new Date(Date.now() + securityConfig.lockoutTime);
      }
      
      await docRef.update(updateData);
      
      logger.warn('Login attempt incremented:', { 
        userId, 
        attempts: loginAttempts,
        locked: loginAttempts >= securityConfig.maxLoginAttempts 
      });
    } catch (error) {
      logger.error('Error incrementing login attempts:', error);
      throw error;
    }
  }

  static async resetLoginAttempts(userId: string): Promise<void> {
    try {
      const db = this.getDb();
      await db.collection('users').doc(userId).update({
        loginAttempts: 0,
        lockUntil: null,
        updatedAt: new Date(),
      });
      
      logger.info('Login attempts reset:', { userId });
    } catch (error) {
      logger.error('Error resetting login attempts:', error);
      throw error;
    }
  }

  static async updateLastLogin(userId: string): Promise<void> {
    try {
      const db = this.getDb();
      await db.collection('users').doc(userId).update({
        lastLogin: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw error;
    }
  }

  static toJSON(user: IUserDocument): Omit<IUserDocument, 'password'> {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}