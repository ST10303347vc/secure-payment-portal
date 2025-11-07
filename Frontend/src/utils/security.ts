import bcrypt from 'bcryptjs';
import CryptoJS from 'crypto-js';

// Password hashing with salt
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12; // High salt rounds for security
  return await bcrypt.hash(password, saltRounds);
};

// Password verification
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// Generate secure random token
export const generateSecureToken = (): string => {
  return CryptoJS.lib.WordArray.random(32).toString();
};

// Encrypt sensitive data
export const encryptData = (data: string, key: string): string => {
  return CryptoJS.AES.encrypt(data, key).toString();
};

// Decrypt sensitive data
export const decryptData = (encryptedData: string, key: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Generate CSRF token
export const generateCSRFToken = (): string => {
  return CryptoJS.lib.WordArray.random(16).toString();
};

// Validate CSRF token
export const validateCSRFToken = (token: string, storedToken: string): boolean => {
  return token === storedToken;
};

// Secure session storage
export class SecureStorage {
  private static encryptionKey = process.env.REACT_APP_ENCRYPTION_KEY || 'default-key-change-in-production';

  static setItem(key: string, value: string): void {
    const encrypted = encryptData(value, this.encryptionKey);
    sessionStorage.setItem(key, encrypted);
  }

  static getItem(key: string): string | null {
    const encrypted = sessionStorage.getItem(key);
    if (!encrypted) return null;
    
    try {
      return decryptData(encrypted, this.encryptionKey);
    } catch {
      return null;
    }
  }

  static removeItem(key: string): void {
    sessionStorage.removeItem(key);
  }

  static clear(): void {
    sessionStorage.clear();
  }
}

// Content Security Policy headers
export const getCSPHeaders = () => ({
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https:",
    "font-src 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "frame-src 'none'"
  ].join('; ')
});

// XSS Protection
export const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// Generate secure headers for requests
export const getSecureHeaders = (csrfToken?: string) => {
  const headers: { [key: string]: string } = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };

  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  return headers;
};