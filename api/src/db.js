import admin from 'firebase-admin';

// Load the service account key from environment variable
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!serviceAccountString) {
  throw new Error('The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
}
const serviceAccount = JSON.parse(serviceAccountString);

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✓ Firebase Firestore initialized');
}

// Export Firestore database instance
const db = admin.firestore();

export default db;
