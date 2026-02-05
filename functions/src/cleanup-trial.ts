import admin from 'firebase-admin';

// Initialize Firebase Admin
const serviceAccount = require('../../avigestao-cf5fe-firebase-adminsdk-aojt4-8b1e21a5b0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function cleanupTrialUser(userId: string) {
  try {
    console.log('Cleaning up trial for user:', userId);
    
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    console.log('Current user data:');
    console.log('  plan:', userData?.plan);
    console.log('  trialEndDate:', userData?.trialEndDate);
    console.log('  subscription:', userData?.subscription);
    
    // Update user document
    await db.collection('users').doc(userId).update({
      plan: 'Profissional',
      trialEndDate: admin.firestore.FieldValue.delete(),
    });
    
    console.log('✅ User updated successfully');
    
    // Verify update
    const updatedDoc = await db.collection('users').doc(userId).get();
    const updatedData = updatedDoc.data();
    
    console.log('Updated user data:');
    console.log('  plan:', updatedData?.plan);
    console.log('  trialEndDate:', updatedData?.trialEndDate);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

// Run cleanup for the test user
const testUserId = 'ijeaEetvmOWoE082731oTg1XTWj2';
cleanupTrialUser(testUserId);
