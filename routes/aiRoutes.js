import express from 'express';
import { generateCampaign, explainSegment } from '../controllers/aiController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateAICampaignGenerate, validateExplainSegment } from '../middlewares/validator.js';

const router = express.Router();

// Apply authentication middleware to all AI endpoints
router.use(authenticate);

router.post('/generate-campaign', validateAICampaignGenerate, generateCampaign);
router.post('/explain-segment', validateExplainSegment, explainSegment);

export default router;
