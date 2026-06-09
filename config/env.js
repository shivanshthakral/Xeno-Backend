import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config();

const requiredEnvVars = [
  'PORT',
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'GEMINI_API_KEY',
  'FIREBASE_PROJECT_ID'
];

const missingEnvVars = [];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    missingEnvVars.push(envVar);
  }
});

if (missingEnvVars.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', 'CRITICAL CONFIGURATION ERROR:');
  console.error('\x1b[31m%s\x1b[0m', `The following required environment variables are missing: ${missingEnvVars.join(', ')}`);
  console.error('\x1b[33m%s\x1b[0m', 'Please verify your .env file before launching the server.');
  process.exit(1);
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  geminiApiKey: process.env.GEMINI_API_KEY,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || null
};
