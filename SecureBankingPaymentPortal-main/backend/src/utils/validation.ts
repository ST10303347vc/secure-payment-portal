/**
 * Validate IBAN (International Bank Account Number)
 * Basic validation for IBAN format and check digit
 */
export const validateIBAN = (iban: string): boolean => {
  if (!iban) return false;

  // Remove spaces and convert to uppercase
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();

  // Check length (15-34 characters)
  if (cleanIban.length < 15 || cleanIban.length > 34) {
    return false;
  }

  // Check if it starts with 2 letters followed by 2 digits
  const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
  if (!ibanRegex.test(cleanIban)) {
    return false;
  }

  // Move first 4 characters to the end
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);

  // Replace letters with numbers (A=10, B=11, ..., Z=35)
  let numericString = '';
  for (const char of rearranged) {
    if (char >= 'A' && char <= 'Z') {
      numericString += (char.charCodeAt(0) - 55).toString();
    } else {
      numericString += char;
    }
  }

  // Calculate mod 97
  let remainder = 0;
  for (let i = 0; i < numericString.length; i++) {
    remainder = (remainder * 10 + parseInt(numericString[i] || '0')) % 97;
  }

  return remainder === 1;
};

/**
 * Validate SWIFT/BIC code
 * Format: 8 or 11 characters
 * First 4: Bank code (letters)
 * Next 2: Country code (letters)
 * Next 2: Location code (letters/digits)
 * Last 3: Branch code (letters/digits, optional)
 */
export const validateSWIFT = (swift: string): boolean => {
  if (!swift) return false;

  // Remove spaces and convert to uppercase
  const cleanSwift = swift.replace(/\s/g, '').toUpperCase();

  // Check length (8 or 11 characters)
  if (cleanSwift.length !== 8 && cleanSwift.length !== 11) {
    return false;
  }

  // Validate format
  const swiftRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  return swiftRegex.test(cleanSwift);
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.toLowerCase());
};

/**
 * Validate phone number (international format)
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return false;

  // Remove spaces, dashes, and parentheses
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  // Check if it starts with + and has 7-15 digits
  const phoneRegex = /^\+[1-9]\d{6,14}$/;
  return phoneRegex.test(cleanPhone);
};

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate currency code (ISO 4217)
 */
export const validateCurrency = (currency: string): boolean => {
  if (!currency) return false;

  const supportedCurrencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
    'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'ZAR', 'BRL', 'INR', 'KRW', 'PLN',
  ];

  return supportedCurrencies.includes(currency.toUpperCase());
};

/**
 * Validate amount
 */
export const validateAmount = (amount: string | number): { isValid: boolean; value?: number; error?: string } => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }

  if (numericAmount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }

  if (numericAmount > 1000000) {
    return { isValid: false, error: 'Amount cannot exceed 1,000,000' };
  }

  // Check for more than 2 decimal places
  const decimalPlaces = (numericAmount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { isValid: false, error: 'Amount cannot have more than 2 decimal places' };
  }

  return { isValid: true, value: numericAmount };
};