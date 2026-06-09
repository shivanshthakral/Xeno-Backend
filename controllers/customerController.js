import { Customer } from '../models/Customer.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { BadRequestError } from '../utils/errors.js';

/**
 * Get Authenticated Customer Profile
 * GET /api/v1/customers/profile
 */
export const getProfile = async (req, res, next) => {
  try {
    // req.user is already populated by the authentication middleware
    return sendSuccess(res, req.user, 'Customer profile retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Update Customer Profile
 * PUT /api/v1/customers/profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      throw new BadRequestError('Customer not found.');
    }

    if (name) customer.name = name;
    if (phone) customer.phone = phone;

    const updatedCustomer = await customer.save();

    return sendSuccess(res, updatedCustomer, 'Customer profile updated successfully.');
  } catch (error) {
    next(error);
  }
};
