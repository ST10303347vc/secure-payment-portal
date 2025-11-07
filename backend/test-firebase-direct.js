const admin = require('firebase-admin');
const path = require('path');

async function testFirebaseWithAppMethod() {
  console.log('🔥 Testing Firebase with exact app initialization method...');
  
  try {
    // Clear any existing apps
    if (admin.apps.length > 0) {
      await Promise.all(admin.apps.map(app => app?.delete()));
    }
    
    // Use the exact same method as the app
    const projectId = 'paymentportal-19df2';
    const serviceAccountPath = './firebase-service-account.json';
    const fullPath = path.resolve(serviceAccountPath);
    
    console.log('Project ID:', projectId);
    console.log('Service Account Path:', fullPath);
    
    // Initialize exactly like the app does
    admin.initializeApp({
      credential: admin.credential.cert(fullPath),
      projectId: projectId,
    });
    
    const db = admin.firestore();
    
    console.log('✅ Firebase initialized successfully');
    
    // Test a simple operation
    console.log('📝 Testing write operation...');
    const testDoc = db.collection('test').doc('auth-test');
    await testDoc.set({
      message: 'Testing authentication',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      testId: Date.now()
    });
    
    console.log('✅ Write operation successful!');
    
    // Clean up
    await testDoc.delete();
    console.log('✅ Cleanup successful!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 16) {
      console.log('\n🔍 Authentication Error Analysis:');
      console.log('- Error code 16 = UNAUTHENTICATED');
      console.log('- This means the service account credentials are invalid or expired');
      console.log('- Possible causes:');
      console.log('  1. Service account key is corrupted or invalid');
      console.log('  2. Service account has been deleted or disabled');
      console.log('  3. Project ID mismatch');
      console.log('  4. Service account lacks proper permissions');
    }
  }
  
  process.exit(0);
}

testFirebaseWithAppMethod();