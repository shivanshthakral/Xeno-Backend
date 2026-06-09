import express from 'express';
import {
  getCampaignMetrics,
  getCampaignInsights,
  getCampaignBenchmark,
  getBestChannel,
  getBestSegment,
  getTrends,
  getExecutiveSummary,
  getOpportunities
} from '../controllers/analyticsController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// All analytics endpoints require authentication
router.use(authenticate);

// 1. Numerical campaign stats
router.get('/campaign/:id', getCampaignMetrics);

// 2. Qualitative AI Insights summary
router.get('/campaign/:id/insights', getCampaignInsights);

// 3. Campaign benchmarking comparison
router.get('/campaign/:id/benchmark', getCampaignBenchmark);

// 4. Best Channel detection
router.get('/best-channel', getBestChannel);

// 5. Best Segment detection
router.get('/best-segment', getBestSegment);

// 6. Marketing and conversion trends over time
router.get('/trends', getTrends);

// 7. Leadership-level executive summaries
router.get('/executive-summary', getExecutiveSummary);

// 8. Dynamic opportunity detector
router.get('/opportunities', getOpportunities);

export default router;
