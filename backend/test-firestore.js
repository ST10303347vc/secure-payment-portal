const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

async function testFirestore() {
  console.log('🔥 Testing Firestore connection...');
  
  try {
    // Test 1: Simple write operation
    console.log('📝 Testing write operation...');
    const testDoc = db.collection('test').doc('connection-test');
    await testDoc.set({
      message: 'Hello Firestore!',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      testId: Math.random().toString(36).substr(2, 9)
    });
    console.log('✅ Write operation successful');
    
    // Test 2: Read operation
    console.log('📖 Testing read operation...');
    const doc = await testDoc.get();
    if (doc.exists) {
      console.log('✅ Read operation successful:', doc.data());
    } else {
      console.log('❌ Document not found');
    }
    
    // Test 3: Collection query
    console.log('🔍 Testing collection query...');
    const snapshot = await db.collection('test').limit(1).get();
    console.log('✅ Query successful, found', snapshot.size, 'documents');
    
    // Test 4: Delete operation
    console.log('🗑️ Testing delete operation...');
    await testDoc.delete();
    console.log('✅ Delete operation successful');
    
    console.log('🎉 All Firestore operations completed successfully!');
    
  } catch (error) {
    console.error('❌ Firestore test failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
  }
  
  process.exit(0);
}

testFirestore();