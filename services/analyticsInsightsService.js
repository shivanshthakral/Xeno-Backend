import { Campaign } from '../models/Campaign.js';
import { Customer } from '../models/Customer.js';
import { Communication } from '../models/Communication.js';
import { Order } from '../models/Order.js';
import { analyticsService } from './analyticsService.js';
import { geminiService } from './geminiService.js';

class AnalyticsInsightsService {
  /**
   * Get Qualitative Campaign Insights
   * GET /api/v1/analytics/campaign/:id/insights
   */
  async getCampaignInsights(campaignId) {
    const metricsData = await analyticsService.getCampaignMetrics(campaignId);
    const { metrics, channel, campaignName } = metricsData;

    // Direct data heuristics for strengths, weaknesses, and recommendations
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];

    // 1. Delivery analysis
    if (metrics.deliveryRate >= 90) {
      strengths.push(`Excellent delivery rate (${metrics.deliveryRate}%) via ${channel}.`);
    } else if (metrics.deliveryRate < 80 && metrics.sent > 0) {
      weaknesses.push(`Low delivery rate (${metrics.deliveryRate}%) via ${channel}.`);
      recommendations.push(`Cleanse phone numbers/email logs to minimize delivery failures.`);
    }

    // 2. Open rate analysis
    if (metrics.openRate >= 50) {
      strengths.push(`Strong recipient interest with an open rate of ${metrics.openRate}%.`);
    } else if (metrics.openRate < 30 && metrics.sent > 0) {
      weaknesses.push(`Low message open rate (${metrics.openRate}%).`);
      recommendations.push(`A/B test message subject headlines and pre-headers to improve opens.`);
    }

    // 3. CTR analysis
    if (metrics.ctr >= 15) {
      strengths.push(`High engagement click-through rate of ${metrics.ctr}%.`);
    } else if (metrics.ctr < 8 && metrics.sent > 0) {
      weaknesses.push(`Low click-through rate (${metrics.ctr}%). Recipient call-to-actions are underperforming.`);
      recommendations.push(`Refine call-to-action buttons or copy urgency in the message template.`);
    }

    // 4. Conversion analysis
    if (metrics.conversionRate >= 8) {
      strengths.push(`Outstanding conversion rate of ${metrics.conversionRate}%.`);
    } else if (metrics.conversionRate < 4 && metrics.sent > 0) {
      weaknesses.push(`Low visitor-to-customer conversion rate (${metrics.conversionRate}%).`);
      recommendations.push(`Retarget clicked users who dropped off before checkout with a limited-time incentive.`);
    }

    // Base fallback summaries
    let summary = `The campaign "${campaignName}" reached ${metrics.sent} customers via ${channel} with a ${metrics.conversionRate}% conversion rate.`;
    if (metrics.conversionRate >= 10) {
      summary = `The campaign performed exceptionally well, exceeding growth targets by converting ${metrics.converted} users.`;
    } else if (metrics.conversionRate < 3 && metrics.sent > 0) {
      summary = `The campaign did not meet expectations due to drop-offs. Optimizations are recommended.`;
    }

    // Attempt to enrich summary qualitative text using Gemini if available
    try {
      const geminiResult = await geminiService.generateCampaignInsights(metrics);
      if (geminiResult && geminiResult.summary) {
        summary = geminiResult.summary;
        if (geminiResult.recommendations && geminiResult.recommendations.length > 0) {
          geminiResult.recommendations.forEach(r => {
            if (!recommendations.includes(r)) recommendations.push(r);
          });
        }
      }
    } catch (err) {
      console.warn(`[INSIGHTS SERVICE] Gemini summary failed, using heuristics: ${err.message}`);
    }

    if (strengths.length === 0) strengths.push('Message template delivered cleanly.');
    if (weaknesses.length === 0) weaknesses.push('No significant channel bottlenecks found.');
    if (recommendations.length === 0) recommendations.push('Scale this strategy to similar audience demographics.');

    return {
      summary,
      strengths,
      weaknesses,
      recommendations
    };
  }

  /**
   * Detect Marketing Opportunities
   * GET /api/v1/analytics/opportunities
   */
  async detectOpportunities() {
    // 1. High value dormant customers
    const dormantHighClvCount = await Customer.countDocuments({
      segmentTags: 'Dormant',
      customerLifetimeValue: { $gte: 500 }
    });

    // 2. VIPs not contacted recently (lastCampaignOpened is null)
    const vipNotContactedCount = await Customer.countDocuments({
      segmentTags: 'VIP',
      lastCampaignOpened: null
    });

    // 3. Clicked but not converted (find from communications log)
    const clickedList = await Communication.find({ status: 'clicked' }).select('customerId').lean();
    const clickedCustomerIds = clickedList.map(c => c.customerId);
    const convertedList = await Communication.find({ status: 'converted', customerId: { $in: clickedCustomerIds } }).select('customerId').lean();
    const convertedCustomerIds = new Set(convertedList.map(c => c.customerId.toString()));
    
    const clickedNotConvertedIds = clickedCustomerIds.filter(id => !convertedCustomerIds.has(id.toString()));
    const uniqueClickedNotConvertedCount = new Set(clickedNotConvertedIds.map(id => id.toString())).size;

    const opportunities = [
      {
        title: 'Re-engage Dormant High-Value Customers',
        description: `There are ${dormantHighClvCount} customers tagged as Dormant who have a lifetime value of $500+.`,
        impact: 'High',
        potentialReach: dormantHighClvCount,
        action: 'Launch a WhatsApp reactivation campaign offering a premium discount code.'
      },
      {
        title: 'Contact Forgotten VIP Customers',
        description: `There are ${vipNotContactedCount} VIP customers who have not opened any recent marketing campaigns.`,
        impact: 'High',
        potentialReach: vipNotContactedCount,
        action: 'Send an exclusive personal email offering early access sale items.'
      },
      {
        title: 'Retarget High-Intent Clickers',
        description: `There are ${uniqueClickedNotConvertedCount} users who clicked on a campaign link but did not check out.`,
        impact: 'Medium',
        potentialReach: uniqueClickedNotConvertedCount,
        action: 'Trigger a follow-up RCS/SMS text with an extra 5% checkout coupon.'
      }
    ];

    // Prioritize high impact opportunities first
    return opportunities.sort((a, b) => b.potentialReach - a.potentialReach);
  }

  /**
   * AI Executive Leadership Summary Report
   * GET /api/v1/analytics/executive-summary
   */
  async getExecutiveSummary() {
    // 1. Calculate Monthly Revenue (from Paid orders in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyRevenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'Paid', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const monthlyRevenue = monthlyRevenueResult.length > 0 ? Math.round(monthlyRevenueResult[0].total) : 0;

    // 2. Find Best Segment by Total CLV
    const bestSegmentResult = await Customer.aggregate([
      { $unwind: '$segmentTags' },
      { $group: { _id: '$segmentTags', clv: { $sum: '$customerLifetimeValue' } } },
      { $sort: { clv: -1 } },
      { $limit: 1 }
    ]);
    const topAudience = bestSegmentResult.length > 0 ? `${bestSegmentResult[0]._id} Customers` : 'VIP Customers';

    // 3. Find Best Channel by average conversion rate
    const channelPerformance = await Communication.aggregate([
      {
        $group: {
          _id: '$channel',
          sent: { $sum: 1 },
          converted: {
            $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
          }
        }
      }
    ]);

    let topChannel = 'Email';
    let maxRate = -1;
    channelPerformance.forEach(c => {
      const rate = c.converted / c.sent;
      if (rate > maxRate) {
        maxRate = rate;
        topChannel = c._id;
      }
    });

    // 4. Determine Overall Health rating
    let overallHealth = 'Needs Attention';
    const totalSent = channelPerformance.reduce((acc, c) => acc + c.sent, 0);
    const totalConverted = channelPerformance.reduce((acc, c) => acc + c.converted, 0);
    const avgConversionRate = totalSent > 0 ? (totalConverted / totalSent) * 100 : 0;

    if (avgConversionRate >= 8) overallHealth = 'Excellent';
    else if (avgConversionRate >= 4) overallHealth = 'Good';

    // 5. Biggest Opportunity & Risk heuristics
    const opportunities = await this.detectOpportunities();
    const biggestOpportunity = opportunities.length > 0 ? opportunities[0].title : 'Retarget recent clickers';
    
    // Risk assessment based on Dormant vs VIP ratio
    const totalDormant = await Customer.countDocuments({ segmentTags: 'Dormant' });
    const totalVips = await Customer.countDocuments({ segmentTags: 'VIP' });
    const biggestRisk = totalDormant > totalVips * 1.5 
      ? 'Dormant accounts are expanding faster than premium VIP retention rates.'
      : 'Potential drop-off in email delivery channels.';

    const nextRecommendation = opportunities.length > 0 ? opportunities[0].action : 'Launch a campaign targeting dormant high-value customers.';

    return {
      overallHealth,
      topAudience,
      topChannel,
      monthlyRevenue,
      biggestOpportunity,
      biggestRisk,
      nextRecommendation
    };
  }
}

export const analyticsInsightsService = new AnalyticsInsightsService();
export default analyticsInsightsService;
