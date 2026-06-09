import express from 'express';
import { createOrder, getMyOrders, getOrderById, updateOrderStatus } from '../controllers/orderController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateOrderCreate, validateOrderStatusUpdate } from '../middlewares/validator.js';

const router = express.Router();

// Apply authentication middleware to all order routes
router.use(authenticate);

router.post('/', validateOrderCreate, createOrder);
router.get('/', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', validateOrderStatusUpdate, updateOrderStatus);

export default router;
