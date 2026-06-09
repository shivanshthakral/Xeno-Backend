import express from 'express';
import { getProfile, updateProfile } from '../controllers/customerController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateProfileUpdate } from '../middlewares/validator.js';

const router = express.Router();

// Apply authentication middleware to all customer profile routes
router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', validateProfileUpdate, updateProfile);

export default router;
