import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri);

    console.log('\x1b[32m%s\x1b[0m', `[DATABASE] MongoDB Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `[DATABASE ERROR] MongoDB Connection Failed: ${error.message}`);
    process.exit(1);
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
