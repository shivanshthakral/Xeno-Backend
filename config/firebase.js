import admin from 'firebase-admin';
import fs from 'fs';
import { env } from './env.js';

let firebaseAdmin = null;

try {
  if (env.firebaseServiceAccountPath && fs.existsSync(env.firebaseServiceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(env.firebaseServiceAccountPath, 'utf8'));
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: env.firebaseProjectId
    });
    console.log('\x1b[32m%s\x1b[0m', '[FIREBASE] Firebase Admin SDK Initialized Successfully via Service Account.');
  } else {
    // Attempt fallback to application default credentials or environment-based initialization
    if (process.env.FIREBASE_CONFIG || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseAdmin = admin.initializeApp();
      console.log('\x1b[32m%s\x1b[0m', '[FIREBASE] Firebase Admin SDK Initialized via Default Application Credentials.');
    } else {
      console.log('\x1b[33m%s\x1b[0m', '[FIREBASE INFO] Firebase service account file path not configured or file not found.');
      console.log('\x1b[33m%s\x1b[0m', '[FIREBASE INFO] Running Firebase in fallback mode (will parse tokens locally or bypass if mock).');
    }
  }
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', `[FIREBASE ERROR] Firebase Admin SDK initialization failed: ${error.message}`);
}

export { firebaseAdmin };
