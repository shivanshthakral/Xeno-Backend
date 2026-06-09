import { Communication } from '../models/Communication.js';
import { Campaign } from '../models/Campaign.js';
import { geminiService } from './geminiService.js';
import { NotFoundError } from '../utils/errors.js';

class AnalyticsService {
  /**
   * Compile numerical metrics for a Campaign based on communication event logs
   * @param {string} campaignId - Campaign unique identifier
   */
  async getCampaignMetrics(campaignId) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError(`Campaign with ID ${campaignId} not found.`);
    }

    // 1. Fetch total communication logs associated with this campaign
    const totalComms = await Communication.find({ campaignId });

    const metrics = {
      sent: totalComms.length,
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      failed: 0,
      conversionRate: 0
    };

    // 2. Iterate status transitions
    // Since statuses are hierarchical in simulation (sent -> delivered -> opened -> clicked -> converted),
    // we inspect the final status of each log.
    totalComms.forEach((comm) => {
      const status = comm.status;
      if (status === 'failed') {
        metrics.failed++;
      } else if (status === 'delivered') {
        metrics.delivered++;
      } else if (status === 'opened') {
        metrics.delivered++;
        metrics.opened++;
      } else if (status === 'clicked') {
        metrics.delivered++;
        metrics.opened++;
        metrics.clicked++;
      } else if (status === 'converted') {
        metrics.delivered++;
        metrics.opened++;
        metrics.clicked++;
        metrics.converted++;
      } else if (status === 'sent') {
        // Was sent but no callback received yet
        // Already accounted for in metrics.sent
      }
    });

    // 3. Compute conversion rate percentage (converted / sent * 100)
    metrics.conversionRate = metrics.sent > 0
      ? parseFloat(((metrics.converted / metrics.sent) * 100).toFixed(2))
      : 0;

    return {
      campaignId,
      campaignName: campaign.goal,
      channel: campaign.channel,
      status: campaign.status,
      metrics
    };
  }

  /**
   * Fetch AI Campaign Insights and optimization recommendations
   * @param {string} campaignId - Campaign unique identifier
   */
  async getCampaignInsights(campaignId) {
    const metricsData = await this.getCampaignMetrics(campaignId);

    // Call Gemini to generate qualitative campaign insights
    const aiInsight = await geminiService.generateCampaignInsights({
      sent: metricsData.metrics.sent,
      delivered: metricsData.metrics.delivered,
      opened: metricsData.metrics.opened,
      clicked: metricsData.metrics.clicked,
      converted: metricsData.metrics.converted,
      failed: metricsData.metrics.failed,
      conversionRate: metricsData.metrics.conversionRate,
      channel: metricsData.channel,
      goal: metricsData.campaignName
    });

    return {
      campaignId,
      campaignName: metricsData.campaignName,
      metrics: metricsData.metrics,
      summary: aiInsight.summary,
      recommendations: aiInsight.recommendations
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
