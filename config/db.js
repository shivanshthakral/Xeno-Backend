import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
  try {
    console.log('[DATABASE] Attempting to connect to MongoDB Atlas...');
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 4000 // fail fast if Atlas is blocked/disconnected
    });

    console.log('\x1b[32m%s\x1b[0m', `[DATABASE] MongoDB Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    console.warn('\x1b[33m%s\x1b[0m', `[DATABASE WARNING] MongoDB Atlas connection failed (IP not whitelisted/Timeout): ${error.message}`);
    console.log('[DATABASE] Starting local in-memory MongoDB fallback...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const localUri = mongod.getUri();
      console.log(`[DATABASE] Local in-memory MongoDB started at: ${localUri}`);

      const conn = await mongoose.connect(localUri);
      console.log('\x1b[32m%s\x1b[0m', '[DATABASE] Local in-memory MongoDB Connected Successfully.');

      // Save server instance for graceful cleanup
      mongoose.connection.mongodServer = mongod;

      // Seed the local in-memory DB with CRM data
      console.log('[DATABASE] Seeding local in-memory database with CRM data...');
      const { seedDatabase } = await import('../scripts/seedCRMData.js');
      await seedDatabase({ isFallback: true });
      console.log('\x1b[32m%s\x1b[0m', '[DATABASE] Database seeding completed successfully. Fallback database is ready.');
    } catch (fallbackError) {
      console.error('\x1b[31m%s\x1b[0m', `[DATABASE ERROR] MongoDB Fallback Failed: ${fallbackError.message}`);
      process.exit(1);
    }
  }
};

// Listeners for database state events
mongoose.connection.on('disconnected', () => {
  console.warn('\x1b[33m%s\x1b[0m', '[DATABASE WARNING] MongoDB disconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', `[DATABASE ERROR] MongoDB Connection Error: ${err}`);
});

// Graceful shutdown on process exit signals
const gracefulExit = async (signal) => {
  try {
    if (mongoose.connection.mongodServer) {
      console.log('[DATABASE] Stopping local in-memory MongoDB server...');
      await mongoose.connection.mongodServer.stop();
    }
    await mongoose.connection.close();
    console.log('\x1b[36m%s\x1b[0m', `[DATABASE] MongoDB connection closed gracefully via ${signal}`);
    process.exit(0);
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', `[DATABASE ERROR] Error during graceful close: ${err.message}`);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulExit('SIGINT'));
process.on('SIGTERM', () => gracefulExit('SIGTERM'));
process.on('USR2', () => gracefulExit('nodemon restart')); // For nodemon restarts
