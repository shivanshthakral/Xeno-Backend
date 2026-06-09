import { analyticsService } from '../services/analyticsService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { BadRequestError } from '../utils/errors.js';

/**
 * Get Campaign Metrics
 * GET /api/v1/analytics/campaign/:id
 */
export const getCampaignMetrics = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new BadRequestError('Campaign ID is required.');
    }
    const metrics = await analyticsService.getCampaignMetrics(id);
    return sendSuccess(res, metrics, 'Campaign metrics retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Get Campaign Insights (Qualitative AI + recommendation report)
 * GET /api/v1/analytics/campaign/:id/insights
 */
export const getCampaignInsights = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new BadRequestError('Campaign ID is required.');
    }
    const insights = await analyticsService.getCampaignInsights(id);
    return sendSuccess(res, insights, 'Campaign AI insights retrieved successfully.');
  } catch (error) {
    next(error);
  }
};
