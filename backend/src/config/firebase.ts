import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '../utils/logger';

let db: FirebaseFirestore.Firestore;

export const initializeFirebase = async (): Promise<void> => {
  try {
    console.log('Initializing Firebase Admin SDK...');
    
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      console.log('Firebase already initialized');
      db = getFirestore();
      return;
    }

    // Validate required environment variables
    const requiredEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required Firebase environment variables: ${missingVars.join(', ')}`);
    }

    // Get Firebase credentials from environment variables
    const projectId = process.env['FIREBASE_PROJECT_ID']!;
    const privateKey = process.env['FIREBASE_PRIVATE_KEY']!.replace(/\\n/g, '\n');
    const clientEmail = process.env['FIREBASE_CLIENT_EMAIL']!;
    
    console.log('Firebase Project ID:', projectId);
    console.log('Firebase Client Email:', clientEmail);

    // Create service account object from environment variables
    const serviceAccount = {
      type: 'service_account',
      project_id: projectId,
      private_key_id: process.env['FIREBASE_PRIVATE_KEY_ID'],
      private_key: privateKey,
      client_email: clientEmail,
      client_id: process.env['FIREBASE_CLIENT_ID'],
      auth_uri: process.env['FIREBASE_AUTH_URI'] || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env['FIREBASE_TOKEN_URI'] || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env['FIREBASE_AUTH_PROVIDER_X509_CERT_URL'] || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env['FIREBASE_CLIENT_X509_CERT_URL']
    };

    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: projectId,
    });

    // Initialize Firestore
    db = getFirestore();
    
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('✅ Firestore initialized successfully');
    
    logger.info('Firebase Admin SDK initialized successfully');
    logger.info(`Connected to Firebase project: ${projectId}`);
    
  } catch (error: any) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    logger.error('Failed to initialize Firebase:', error);
    throw error;
  }
};

export const getFirestoreDb = (): FirebaseFirestore.Firestore => {
  if (!db) {
    throw new Error('Firestore not initialized. Call initializeFirebase() first.');
  }
  return db;
};

export { admin };