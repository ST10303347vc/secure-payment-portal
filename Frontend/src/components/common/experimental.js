// Experimental features - work in progress
// TODO: Clean this up before production

// Experimental auto-save functionality
let autoSaveTimer;
const AUTO_SAVE_DELAY = 2000;

export const startAutoSave = (formData, saveCallback) => {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    console.log('Auto-saving form data...'); // Debug
    saveCallback(formData);
  }, AUTO_SAVE_DELAY);
};

// FIXME: This is a hacky implementation
export const formatCurrency = (amount, currency = 'EUR') => {
  // Quick and dirty currency formatting
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`;
  } else if (currency === 'GBP') {
    return `£${amount.toFixed(2)}`;
  }
  return `€${amount.toFixed(2)}`;
};

// Experimental feature flag system
const FEATURE_FLAGS = {
  DARK_MODE: false,
  ADVANCED_VALIDATION: true,
  REAL_TIME_NOTIFICATIONS: false
};

export const isFeatureEnabled = (feature) => {
  return FEATURE_FLAGS[feature] || false;
};

// Debug helper functions
export const logFormState = (formName, state) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`Form State: ${formName}`);
    console.log('Current state:', state);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }
};

/*
// Commented out experimental payment validation
export const validatePaymentAmount = (amount, currency) => {
  const limits = {
    EUR: { min: 1, max: 50000 },
    USD: { min: 1, max: 60000 },
    GBP: { min: 1, max: 45000 }
  };
  
  const limit = limits[currency] || limits.EUR;
  return amount >= limit.min && amount <= limit.max;
};
*/