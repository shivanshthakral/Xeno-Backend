import { recommendationService } from './recommendationService.js';
import { geminiService } from './geminiService.js';
import { Customer } from '../models/Customer.js';
import { Segment } from '../models/Segment.js';

class CampaignGeneratorService {
  /**
   * Generate a complete, end-to-end campaign strategy based on a business goal
   * @param {string} goal - Campaign goal description
   */
  async generateStrategy(goal) {
    // 1. Analyze and recommend target audience segment
    const audienceInfo = await recommendationService.recommendAudience(goal);
    const segmentName = audienceInfo.segmentName;
    const audienceReason = audienceInfo.audienceReason;

    // 2. Analyze and recommend dispatch channel
    const channelInfo = await recommendationService.recommendChannel(segmentName);
    const channel = channelInfo.channel;
    const channelReason = channelInfo.channelReason;

    // 3. Predict metrics and reach outcomes
    const predictedReach = await recommendationService.predictReach(segmentName);
    const predictedRevenue = await recommendationService.predictRevenue(segmentName);
    const predictedConvRate = await recommendationService.predictConversion(segmentName);

    // 4. Generate highly contextual marketing message via Gemini
    let generatedMessage = `Hey {{name}}! We noticed you'd love our latest offers. Visit Xeno CRM today!`;
    try {
      const geminiResult = await geminiService.generateCampaignStrategy(goal);
      if (geminiResult && geminiResult.message) {
        generatedMessage = geminiResult.message;
      }
    } catch (err) {
      console.warn(`[CAMPAIGN GEN WARNING] Gemini strategy writing failed: ${err.message}. Using default copy.`);
    }

    // 5. Calculate a dynamic confidence score based on segment engagement statistics
    let confidenceScore = 85; // Default baseline
    const segment = await Segment.findOne({ name: segmentName });
    if (segment) {
      const stats = await Customer.aggregate([
        { $match: segment.query },
        { $group: { _id: null, avgEngagement: { $avg: '$engagementScore' } } }
      ]);
      if (stats.length > 0) {
        const avgEngagement = stats[0].avgEngagement;
        // Confidence ranges from 70% to 98% based on the audience's engagement score
        confidenceScore = Math.round(70 + (avgEngagement / 100) * 28);
      }
    }

    // Return the completed campaign strategy profile
    return {
      segment: segmentName,
      audienceReason,
      channel,
      channelReason,
      generatedMessage,
      predictedReach,
      predictedRevenue,
      confidenceScore
    };
  }
}

export const campaignGeneratorService = new CampaignGeneratorService();
export default campaignGeneratorService;
