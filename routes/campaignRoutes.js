import express from 'express';
import { createCampaign, getAllCampaigns, getCampaignById, updateCampaign, launchCampaign } from '../controllers/campaignController.js';
import { getCampaignCommunications } from '../controllers/communicationController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateCampaignCreate, validateCampaignLaunch } from '../middlewares/validator.js';

const router = express.Router();

// Apply authentication middleware to all campaign routes
router.use(authenticate);

router.post('/', validateCampaignCreate, createCampaign);
router.get('/', getAllCampaigns);
router.get('/:id', getCampaignById);
router.put('/:id', updateCampaign);
router.post('/:id/launch', validateCampaignLaunch, launchCampaign);
router.get('/:id/communications', getCampaignCommunications);

export default router;
