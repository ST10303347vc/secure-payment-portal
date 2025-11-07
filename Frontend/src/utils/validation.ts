// Comprehensive input validation with RegEx patterns for security
export const ValidationPatterns = {
  // Email validation - strict pattern
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // Password - at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  
  // Name - only letters, spaces, hyphens, apostrophes
  name: /^[a-zA-Z\s\-']{2,50}$/,
  
  // Phone number - international format
  phone: /^\+?[1-9]\d{1,14}$/,
  
  // Account number - alphanumeric, 8-20 characters
  accountNumber: /^[A-Za-z0-9]{8,20}$/,
  
  // IBAN - international bank account number
  iban: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/,
  
  // SWIFT/BIC code
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  
  // Amount - decimal with up to 2 decimal places
  amount: /^\d+(\.\d{1,2})?$/,
  
  // Currency code - 3 letter ISO code
  currency: /^[A-Z]{3}$/,
  
  // Address - alphanumeric with common punctuation
  address: /^[a-zA-Z0-9\s\-.,#/]{5,100}$/,
  
  // City - letters, spaces, hyphens, apostrophes
  city: /^[a-zA-Z\s\-']{2,50}$/,
  
  // Postal code - flexible international format
  postalCode: /^[A-Za-z0-9\s\-]{3,10}$/,
  
  // Country code - 2 letter ISO code
  countryCode: /^[A-Z]{2}$/,
  
  // Reference/Description - alphanumeric with basic punctuation
  reference: /^[a-zA-Z0-9\s\-.,#/]{1,100}$/
};

export const ValidationMessages = {
  email: 'Please enter a valid email address',
  password: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
  name: 'Name must contain only letters, spaces, hyphens and apostrophes (2-50 characters)',
  phone: 'Please enter a valid international phone number',
  accountNumber: 'Account number must be 8-20 alphanumeric characters',
  iban: 'Please enter a valid IBAN',
  swiftCode: 'Please enter a valid SWIFT/BIC code',
  amount: 'Amount must be a valid number with up to 2 decimal places',
  currency: 'Currency must be a 3-letter ISO code',
  address: 'Address must be 5-100 characters with letters, numbers and basic punctuation',
  city: 'City must contain only letters, spaces, hyphens and apostrophes (2-50 characters)',
  postalCode: 'Postal code must be 3-10 characters',
  countryCode: 'Country code must be 2 letters',
  reference: 'Reference must be 1-100 characters with letters, numbers and basic punctuation'
};

// Input sanitization function
// Sanitize input by normalizing and escaping, avoiding fragile regex-based removal
export const sanitizeInput = (input: string): string => {
  const normalized = input.normalize('NFKC').trim();
  // Escape HTML special characters to prevent injection
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return normalized.replace(/[&<>"']/g, (m) => map[m]);
};

// Strict URL validation helper to ensure https scheme only
export const isSafeUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Validate input against pattern
export const validateInput = (value: string, pattern: keyof typeof ValidationPatterns): boolean => {
  const sanitized = sanitizeInput(value);
  return ValidationPatterns[pattern].test(sanitized);
};

// Get validation message
export const getValidationMessage = (pattern: keyof typeof ValidationPatterns): string => {
  return ValidationMessages[pattern];
};

// Rate limiting for form submissions
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);
    return true;
  }
}

export const rateLimiter = new RateLimiter();