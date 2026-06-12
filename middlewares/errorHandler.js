import { AppError } from '../utils/errors.js';

export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  res.locals.error = err.message; // Save error message for requestLogger middleware

  // In development, log the full error stack trace
  if (process.env.NODE_ENV !== 'production') {
    console.error(`\x1b[31m[ERROR] ${req.method} ${req.originalUrl}\x1b[0m`);
    console.error(err.stack);
  }

  // Handle Mongoose Cast Errors (Invalid ObjectIds)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid format for field '${err.path}': '${err.value}'`
    });
  }

  // Handle Mongoose Duplicate Key Errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    return res.status(409).json({
      success: false,
      error: `Duplicate value entered. The ${field} '${value}' already exists.`
    });
  }

  // Handle Mongoose Schema Validation Errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((el) => el.message);
    return res.status(400).json({
      success: false,
      error: `Validation error: ${messages.join(', ')}`
    });
  }

  // Handle JWT Error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token. Please log in again.'
    });
  }

  // Handle JWT Expiration
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Your login session has expired. Please log in again.'
    });
  }

  // Operational Errors (Explicitly thrown AppErrors)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  // Default Fallback for Unhandled/Internal Errors
  return res.status(500).json({
    success: false,
    error: 'Internal Server Error. Please contact backend administrator.'
  });
};
