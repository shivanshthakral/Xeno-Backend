import { campaignGeneratorService } from '../services/campaignGeneratorService.js';
import { geminiService } from '../services/geminiService.js';
import { Segment } from '../models/Segment.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

/**
 * Generate Campaign Recommendation via AI Strategy Generator
 * POST /api/v1/ai/generate-campaign
 */
export const generateCampaign = async (req, res, next) => {
  try {
    const { goal } = req.body;

    if (!goal) {
      throw new BadRequestError('Marketing goal description is required.');
    }

    // Call the campaign strategy generator service
    const strategy = await campaignGeneratorService.generateStrategy(goal);

    // Return exact API contract wrapped in response helper
    return sendSuccess(res, strategy, 'Campaign recommendations compiled successfully via AI.');
  } catch (error) {
    next(error);
  }
};

/**
 * Explain MongoDB Segment Query in Natural Language
 * POST /api/v1/ai/explain-segment
 */
export const explainSegment = async (req, res, next) => {
  try {
    const { segmentId } = req.body;

    if (!segmentId) {
      throw new BadRequestError('segmentId is required.');
    }

    const segment = await Segment.findById(segmentId);
    if (!segment) {
      throw new NotFoundError('Segment not found.');
    }

    // Call Gemini to generate a qualitative plain-English query explanation
    const explanation = await geminiService.generateSegmentExplanation(segment.query);

    return sendSuccess(res, { explanation }, 'Segment rules decoded successfully via AI.');
  } catch (error) {
    next(error);
  }
};
