import jwt from 'jsonwebtoken';
import { Customer } from '../models/Customer.js';
import { env } from '../config/env.js';
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors.js';
import { sendSuccess } from '../utils/apiResponse.js';

// Helper function to sign local JWT
const signToken = (id) => {
  return jwt.sign({ id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
};

// Helper to cookie configure and dispatch success payload
const createSendToken = (user, statusCode, res, message) => {
  const token = signToken(user._id);

  // Parse JWT expiry to Ms
  const match = env.jwtExpiresIn.match(/^(\d+)([a-zA-Z]+)$/);
  let maxAge = 7 * 24 * 60 * 60 * 1000; // default 7 days
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit === 'd' || unit === 'day' || unit === 'days') maxAge = value * 24 * 60 * 60 * 1000;
    else if (unit === 'h' || unit === 'hour' || unit === 'hours') maxAge = value * 60 * 60 * 1000;
    else if (unit === 'm' || unit === 'minute' || unit === 'minutes') maxAge = value * 60 * 1000;
  }

  const cookieOptions = {
    expires: new Date(Date.now() + maxAge),
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax'
  };

  res.cookie('token', token, cookieOptions);

  // Remove password from output JSON
  const userOutput = user.toObject();
  delete userOutput.password;

  return sendSuccess(res, { token, user: userOutput }, message, statusCode);
};

/**
 * Register Customer locally
 * POST /api/v1/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check duplicate email
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      throw new ConflictError('A customer with this email address already exists.');
    }

    // Create new customer
    const newCustomer = await Customer.create({
      name,
      email,
      password,
      phone,
      engagementScore: 50 // Default starter score for newly registered customers
    });

    return createSendToken(newCustomer, 210, res, 'Customer registered successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Local Customer Login
 * POST /api/v1/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists and fetch password field
    const user = await Customer.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password, user.password))) {
      throw new UnauthorizedError('Incorrect email or password.');
    }

    return createSendToken(user, 200, res, 'Logged in successfully.');
  } catch (error) {
    next(error);
  }
};
