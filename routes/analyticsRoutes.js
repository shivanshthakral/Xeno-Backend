import express from 'express';
import { getCampaignMetrics, getCampaignInsights } from '../controllers/analyticsController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// All analytics routes require authentication
router.use(authenticate);

// Get numerical campaign stats
router.get('/campaign/:id', getCampaignMetrics);

// Get AI qualitative summary and campaign recommendations
router.get('/campaign/:id/insights', getCampaignInsights);

export default router;
