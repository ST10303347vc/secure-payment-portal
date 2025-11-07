// Experimental backend features - DO NOT USE IN PRODUCTION
// TODO: Convert to TypeScript
// FIXME: This file has mixed coding styles intentionally
// honestly not sure why I made this file but keeping it for now

const crypto = require('crypto');

// Experimental payment batching (incomplete)
// started this during a late night coding session...
class PaymentBatcher {
  constructor() {
    this.batch = [];
    this.batchSize = 10; // arbitrary number, might change later
    this.timer = null;
  }

  addPayment(payment) {
    console.log('Adding payment to batch:', payment.id); // Debug - remove later
    this.batch.push(payment);
    
    if (this.batch.length >= this.batchSize) {
      this.processBatch();
    } else {
      this.scheduleBatch();
    }
  }

  scheduleBatch() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.processBatch();
    }, 5000); // 5 second delay - seems reasonable?
  }

  processBatch() {
    if (this.batch.length === 0) return;
    
    console.log(`Processing batch of ${this.batch.length} payments`);
    // TODO: Implement actual batch processing
    // for now just clearing the batch...
    this.batch = [];
    this.timer = null;
  }
}

// Quick and dirty rate limiter (experimental)
// copied from stackoverflow and modified lol
const rateLimits = new Map();

function simpleRateLimit(key, maxRequests = 100, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimits.has(key)) {
    rateLimits.set(key, []);
  }
  
  const requests = rateLimits.get(key);
  
  // Remove old requests
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (validRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  validRequests.push(now);
  rateLimits.set(key, validRequests);
  
  return true;
}

// Mock exchange rates - obviously not real-time data
// need to integrate with actual API later but this works for testing
const MOCK_EXCHANGE_RATES = {
  'EUR-USD': 1.08,
  'EUR-GBP': 0.86,
  'USD-EUR': 0.93,
  'USD-GBP': 0.80,
  'GBP-EUR': 1.16,
  'GBP-USD': 1.25,
  // TODO: add more currencies
};

function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  
  const rateKey = `${fromCurrency}-${toCurrency}`;
  const rate = MOCK_EXCHANGE_RATES[rateKey];
  
  if (!rate) {
    throw new Error(`Exchange rate not available for ${rateKey}`);
  }
  
  return Math.round(amount * rate * 100) / 100; // round to 2 decimal places
}

/* 
// Commented out experimental audit logger
// was working on this but got distracted by other features
function auditLog(action, userId, details) {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    details,
    hash: crypto.createHash('sha256').update(JSON.stringify({action, userId, details})).digest('hex')
  };
  
  // TODO: Store in audit database
  console.log('AUDIT:', auditEntry);
}
*/

module.exports = {
  PaymentBatcher,
  simpleRateLimit,
  convertCurrency
  // auditLog // maybe enable this later
};