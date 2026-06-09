import express from 'express';
import { receiveReceipt, getAllCommunications, getCommunicationById } from '../controllers/communicationController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Webhook callback endpoint - does not require user authentication as it is triggered externally
router.post('/receipt', receiveReceipt);

// Query endpoints - require customer authentication
router.get('/', authenticate, getAllCommunications);
router.get('/:id', authenticate, getCommunicationById);

export default router;
