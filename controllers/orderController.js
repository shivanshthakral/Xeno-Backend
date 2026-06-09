import { Order } from '../models/Order.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

/**
 * Create a new Customer Order
 * POST /api/v1/orders
 */
export const createOrder = async (req, res, next) => {
  try {
    const { items, paymentStatus } = req.body;

    const newOrder = await Order.create({
      customerId: req.user._id,
      items,
      paymentStatus: paymentStatus || 'Pending'
    });

    return sendSuccess(res, newOrder, 'Order placed successfully.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Orders for the Logged-in Customer
 * GET /api/v1/orders
 */
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customerId: req.user._id }).sort({ createdAt: -1 });
    return sendSuccess(res, orders, 'Customer orders retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific Order by ID (with Ownership validation)
 * GET /api/v1/orders/:id
 */
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    // Ownership check: Ensure the order belongs to the logged-in customer
    if (order.customerId.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You do not have permission to view this order.');
    }

    return sendSuccess(res, order, 'Order details retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Update Order Status and Payment Status (Simulated admin/merchant interface)
 * PUT /api/v1/orders/:id/status
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    // Ensure the order belongs to the logged-in customer for the demo,
    // or allow status updates (simulation of callback/dispatch flows).
    if (order.customerId.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You do not have permission to modify this order.');
    }

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    const updatedOrder = await order.save();

    return sendSuccess(res, updatedOrder, 'Order status updated successfully.');
  } catch (error) {
    next(error);
  }
};
