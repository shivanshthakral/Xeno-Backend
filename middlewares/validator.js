import { body, param, validationResult } from 'express-validator';
import { BadRequestError } from '../utils/errors.js';

// Reusable runner middleware that catches express-validation results
export const validateResults = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((err) => `${err.path}: ${err.msg}`).join(', ');
    return next(new BadRequestError(`Validation failure: ${errorDetails}`));
  }
  next();
};

// Registration request validation rules
export const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage('Phone must be a valid string'),
  validateResults
];

// Login request validation rules
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validateResults
];

// Profile update validation rules
export const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty if provided')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage('Phone must be a valid string'),
  validateResults
];

// Order creation validation rules
export const validateOrderCreate = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least 1 item'),
  body('items.*.name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Item quantity must be a positive integer >= 1'),
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage('Item price must be a non-negative number >= 0'),
  validateResults
];

// Order status update validation rules
export const validateOrderStatusUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Order ID format'),
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'])
    .withMessage('Status must be one of: Pending, Processing, Shipped, Delivered, Cancelled'),
  validateResults
];

// ─── Phase 2: CRM Validators ─────────────────────────────────────────────────

// Segment creation validation rules
export const validateSegmentCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Segment name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Segment name must be between 2 and 100 characters'),
  body('query')
    .notEmpty().withMessage('Segment query filter is required')
    .custom((value) => {
      if (typeof value === 'object' && value !== null) return true;
      if (typeof value === 'string') {
        try { JSON.parse(value); return true; } catch { return false; }
      }
      return false;
    }).withMessage('Segment query must be a valid JSON object'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isString().withMessage('Description must be a string'),
  validateResults
];

// Segment update validation rules
export const validateSegmentUpdate = [
  param('id').isMongoId().withMessage('Invalid Segment ID format'),
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Segment name cannot be empty if provided')
    .isLength({ min: 2, max: 100 }).withMessage('Segment name must be between 2 and 100 characters'),
  body('query')
    .optional()
    .custom((value) => {
      if (typeof value === 'object' && value !== null) return true;
      if (typeof value === 'string') {
        try { JSON.parse(value); return true; } catch { return false; }
      }
      return false;
    }).withMessage('Segment query must be a valid JSON object'),
  validateResults
];

// Campaign creation validation rules
export const validateCampaignCreate = [
  body('goal')
    .trim()
    .notEmpty().withMessage('Campaign goal is required'),
  body('customGoal')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 }).withMessage('Custom goal must not exceed 200 characters'),
  body('segmentId')
    .notEmpty().withMessage('segmentId is required')
    .isMongoId().withMessage('Invalid Segment ID format'),
  body('channel')
    .trim()
    .notEmpty().withMessage('Channel is required')
    .isIn(['Email', 'SMS', 'WhatsApp', 'RCS'])
    .withMessage('Channel must be: Email, SMS, WhatsApp, or RCS'),
  body('generatedMessage')
    .trim()
    .notEmpty().withMessage('Campaign message content is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Campaign message must be between 10 and 1000 characters'),
  body('predictedReach')
    .optional()
    .isInt({ min: 0 }).withMessage('Predicted reach must be a non-negative integer'),
  body('predictedRevenue')
    .optional()
    .isFloat({ min: 0 }).withMessage('Predicted revenue must be a non-negative number'),
  validateResults
];

// Campaign launch validation rules
export const validateCampaignLaunch = [
  param('id').isMongoId().withMessage('Invalid Campaign ID format'),
  validateResults
];

// NL Segment generation validation rules
export const validateSegmentGenerate = [
  body('prompt')
    .trim()
    .notEmpty().withMessage('Natural language prompt is required')
    .isLength({ min: 5, max: 500 }).withMessage('Prompt must be between 5 and 500 characters'),
  validateResults
];

// AI Campaign generation validation rules
export const validateAICampaignGenerate = [
  body('goal')
    .trim()
    .notEmpty().withMessage('Campaign goal is required')
    .isLength({ min: 5, max: 300 }).withMessage('Goal must be between 5 and 300 characters'),
  validateResults
];

// Explain segment validation rules
export const validateExplainSegment = [
  body('segmentId')
    .notEmpty().withMessage('segmentId is required')
    .isMongoId().withMessage('Invalid Segment ID format'),
  validateResults
];
