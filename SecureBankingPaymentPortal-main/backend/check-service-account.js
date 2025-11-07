const fs = require('fs');

try {
  const key = require('./firebase-service-account.json');
  
  console.log('🔍 Service Account Key Analysis:');
  console.log('================================');
  
  const requiredFields = [
    'type',
    'project_id', 
    'private_key_id',
    'private_key',
    'client_email',
    'client_id',
    'auth_uri',
    'token_uri'
  ];
  
  console.log('Required fields check:');
  requiredFields.forEach(field => {
    const exists = !!key[field];
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${field}: ${exists}`);
    
    if (field === 'private_key' && exists) {
      // Check if private key looks valid (starts with -----BEGIN PRIVATE KEY-----)
      const isValidFormat = key[field].includes('-----BEGIN PRIVATE KEY-----');
      console.log(`   Private key format: ${isValidFormat ? '✅ Valid' : '❌ Invalid'}`);
    }
  });
  
  console.log('\nProject Details:');
  console.log(`- Project ID: ${key.project_id}`);
  console.log(`- Client Email: ${key.client_email}`);
  console.log(`- Type: ${key.type}`);
  
  // Check file permissions
  const stats = fs.statSync('./firebase-service-account.json');
  console.log(`\nFile permissions: ${stats.mode.toString(8)}`);
  
} catch (error) {
  console.error('❌ Error reading service account file:', error.message);
}