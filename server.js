import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

// Load config
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import segmentRoutes from './routes/segmentRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import communicationRoutes from './routes/communicationRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';

// Middleware Imports
import { errorHandler } from './middlewares/errorHandler.js';
import { NotFoundError } from './utils/errors.js';

// Connect to MongoDB Atlas database
connectDB();

const app = express();

// Enable Morgan request logger in development
if (env.nodeEnv !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS Configuration supporting cookie credentials
app.use(
  cors({
    origin: true, // Auto-reflect requesting origin (great for dev/local testing)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  })
);

// Standard parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Base health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Xeno CRM Backend is active and running.',
    timestamp: new Date()
  });
});

// Register Core APIs
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/segments', segmentRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/communications', communicationRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);

// Catch-all route to trigger NotFoundError
app.all('*', (req, res, next) => {
  next(new NotFoundError(`Cannot find endpoint ${req.method} ${req.originalUrl}`));
});

// Centralized error mapping and handling middleware
app.use(errorHandler);

// Start the server
const server = app.listen(env.port, () => {
  console.log('\x1b[32m%s\x1b[0m', `[SERVER] CRM Service running in [${env.nodeEnv}] on port ${env.port}`);
});

export { app, server };
export default app;
