import { recommendationService } from '../services/recommendationService.js';
import { Segment } from '../models/Segment.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * Get Dynamic Campaign Recommendations
 * GET /api/v1/recommendations
 */
export const getRecommendations = async (req, res, next) => {
  try {
    // 1. Fetch all segments from the database
    const segments = await Segment.find({});

    let bestAudience = 'Frequent Buyers';
    let bestChannel = 'Email';
    let estimatedReach = 100;
    let estimatedRevenue = 3000;
    let maxRevenue = -1;

    // 2. Loop through segments and select the one yielding the highest estimated revenue
    for (const segment of segments) {
      const reach = await recommendationService.predictReach(segment.name);
      const revenue = await recommendationService.predictRevenue(segment.name);
      const channelInfo = await recommendationService.recommendChannel(segment.name);

      if (revenue > maxRevenue && reach > 0) {
        maxRevenue = revenue;
        bestAudience = segment.name;
        bestChannel = channelInfo.channel;
        estimatedReach = reach;
        estimatedRevenue = revenue;
      }
    }

    // Return the dynamically compiled recommendation
    return sendSuccess(res, {
      bestAudience,
      bestChannel,
      estimatedReach,
      estimatedRevenue
    }, 'Dynamic campaign recommendations generated successfully.');
  } catch (error) {
    next(error);
  }
};
