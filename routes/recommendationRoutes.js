import express from 'express';
import { getRecommendations } from '../controllers/recommendationController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Apply authentication middleware to all recommendation routes
router.use(authenticate);

// Get global campaign advisor recommendations
router.get('/', getRecommendations);

export default router;
