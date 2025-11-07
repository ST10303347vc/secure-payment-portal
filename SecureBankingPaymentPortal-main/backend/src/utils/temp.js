// Temporary utility functions - TODO: organize these properly

// Quick function to generate test data
function generateTestPayments(count = 10) {
  const payments = [];
  const currencies = ['USD', 'EUR', 'GBP'];
  const statuses = ['pending', 'completed', 'failed'];
  
  for (let i = 0; i < count; i++) {
    payments.push({
      amount: Math.random() * 1000,
      currency: currencies[Math.floor(Math.random() * currencies.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      recipientName: `Test User ${i + 1}`,
      reference: `TEST-${Date.now()}-${i}`
    });
  }
  
  return payments;
}

// Debug helper - remove before production
function logPaymentStats(payments) {
  console.log('Payment Statistics:');
  console.log('Total payments:', payments.length);
  
  const byStatus = payments.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
  
  console.log('By status:', byStatus);
}

// FIXME: This is a hack for testing - replace with proper implementation
const TEMP_EXCHANGE_RATES = {
  'USD': 1.0,
  'EUR': 0.85,
  'GBP': 0.73
};

function convertCurrency(amount, from, to) {
  // Very basic conversion - not for production use!
  const usdAmount = amount / TEMP_EXCHANGE_RATES[from];
  return usdAmount * TEMP_EXCHANGE_RATES[to];
}

module.exports = {
  generateTestPayments,
  logPaymentStats,
  convertCurrency
};