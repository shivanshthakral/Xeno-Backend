import { Customer } from '../models/Customer.js';
import { Segment } from '../models/Segment.js';
import { Communication } from '../models/Communication.js';

class RecommendationService {
  /**
   * Recommend the best audience segment name and reason for a marketing goal
   * @param {string} goal - Marketing campaign goal
   */
  async recommendAudience(goal) {
    const cleanGoal = goal.toLowerCase();
    let segmentName = 'Frequent Buyers';
    let audienceReason = 'Targeting standard frequent buyers to maintain consistent purchase frequencies.';

    if (cleanGoal.includes('vip') || cleanGoal.includes('premium') || cleanGoal.includes('loyalty') || cleanGoal.includes('high value')) {
      segmentName = 'VIP Customers';
      audienceReason = 'Targeting VIPs with high lifetime value to maximize revenue via high-ticket upsells.';
    } else if (cleanGoal.includes('dormant') || cleanGoal.includes('repeat') || cleanGoal.includes('reactivate') || cleanGoal.includes('miss')) {
      segmentName = 'Dormant Customers';
      audienceReason = 'Reactivating dormant accounts that have not purchased recently to boost repeat transactions.';
    } else if (cleanGoal.includes('churn') || cleanGoal.includes('risk') || cleanGoal.includes('reclaim')) {
      segmentName = 'Churn Risk Customers';
      audienceReason = 'Intercepting customers with dropping engagement scores to prevent complete churn.';
    } else if (cleanGoal.includes('new') || cleanGoal.includes('welcome') || cleanGoal.includes('first')) {
      // If we don't have a pre-seeded segment for New, fallback to Churn Risk or Frequent Buyers
      segmentName = 'Frequent Buyers';
      audienceReason = 'Targeting customer cohorts with active accounts to build immediate traction.';
    }

    // Double check if segment exists in DB
    const segmentExists = await Segment.findOne({ name: segmentName });
    if (!segmentExists) {
      // Fallback if seeder wasn't run
      return { segmentName: 'Frequent Buyers', audienceReason };
    }

    return { segmentName: segmentExists.name, audienceReason };
  }

  /**
   * Recommend the best channel for a segment based on historical metrics or heuristics
   * @param {string} segmentName - Segment Name
   */
  async recommendChannel(segmentName) {
    // Try to find historical conversion rates by channel for this segment
    const segment = await Segment.findOne({ name: segmentName });
    if (segment) {
      const customers = await Customer.find(segment.query).select('_id');
      const customerIds = customers.map(c => c._id);

      // Aggregate conversion rates from communication log history
      const history = await Communication.aggregate([
        { $match: { customerId: { $in: customerIds } } },
        {
          $group: {
            _id: '$channel',
            total: { $sum: 1 },
            converted: {
              $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
            }
          }
        }
      ]);

      if (history.length > 0) {
        // Find channel with best conversion rate
        let bestChannel = null;
        let bestRate = -1;

        history.forEach(h => {
          const rate = h.converted / h.total;
          if (rate > bestRate) {
            bestRate = rate;
            bestChannel = h._id;
          }
        });

        if (bestChannel) {
          return {
            channel: bestChannel,
            channelReason: `Historically, ${bestChannel} yields the highest conversion rate (${Math.round(bestRate * 100)}%) for this audience.`
          };
        }
      }
    }

    // Heuristics Fallbacks if no history exists
    if (segmentName === 'VIP Customers') {
      return {
        channel: 'Email',
        channelReason: 'Rich, personalized email templates are highly effective for showcasing premium offerings to VIPs.'
      };
    } else if (segmentName === 'Dormant Customers') {
      return {
        channel: 'WhatsApp',
        channelReason: 'WhatsApp provides high open rates to grab attention and reactivate dormant buyers.'
      };
    } else if (segmentName === 'Churn Risk Customers') {
      return {
        channel: 'SMS',
        channelReason: 'Direct SMS alerts with urgent, time-sensitive incentives help re-engage churn risks.'
      };
    }

    return {
      channel: 'Email',
      channelReason: 'Standard email communication provides a balanced and non-intrusive way to reach frequent buyers.'
    };
  }

  /**
   * Predict customer reach of a segment dynamically
   * @param {string} segmentName - Segment Name
   */
  async predictReach(segmentName) {
    const segment = await Segment.findOne({ name: segmentName });
    if (!segment) return 50; // Fallback default

    // Dynamically calculate reach from DB
    const count = await Customer.countDocuments(segment.query);
    return count;
  }

  /**
   * Predict campaign conversion rate (percentage) dynamically
   * @param {string} segmentName - Segment Name
   */
  async predictConversion(segmentName) {
    const segment = await Segment.findOne({ name: segmentName });
    if (!segment) return 5; // Default 5%

    // Aggregate average engagement score for segment's customers
    const stats = await Customer.aggregate([
      { $match: segment.query },
      { $group: { _id: null, avgEngagement: { $avg: '$engagementScore' } } }
    ]);

    const avgEngagement = stats.length > 0 ? stats[0].avgEngagement : 50;

    // Base conversion rates by segment group
    let baseRate = 8; // Default 8%
    if (segmentName === 'VIP Customers') baseRate = 12;
    else if (segmentName === 'Dormant Customers') baseRate = 4;
    else if (segmentName === 'Churn Risk Customers') baseRate = 3;

    // Adjust base conversion rate based on segment engagement (up to +/- 50%)
    const multiplier = avgEngagement / 50; // e.g. 80 engagement -> 1.6x multiplier
    const predictedRate = parseFloat((baseRate * Math.min(Math.max(multiplier, 0.5), 1.5)).toFixed(2));

    return predictedRate;
  }

  /**
   * Predict revenue of a segment dynamically
   * @param {string} segmentName - Segment Name
   */
  async predictRevenue(segmentName) {
    const segment = await Segment.findOne({ name: segmentName });
    if (!segment) return 1500;

    const reach = await this.predictReach(segmentName);
    const conversionRate = await this.predictConversion(segmentName);

    // Get average CLV of this segment to estimate spend
    const stats = await Customer.aggregate([
      { $match: segment.query },
      { $group: { _id: null, avgClv: { $avg: '$customerLifetimeValue' } } }
    ]);

    const avgClv = stats.length > 0 && stats[0].avgClv > 0 ? stats[0].avgClv : 150;
    
    // Estimate order value is a portion of CLV (e.g. 25% of average CLV or $30 minimum)
    const estimatedOrderValue = Math.max(avgClv * 0.25, 30);
    const expectedConversions = reach * (conversionRate / 100);

    return Math.round(expectedConversions * estimatedOrderValue);
  }

  /**
   * Maintain backward compatibility for Phase 1/2 controller endpoints
   * @param {string} goal - Marketing goal
   */
  async getCampaignRecommendation(goal) {
    const audienceInfo = await this.recommendAudience(goal);
    const channelInfo = await this.recommendChannel(audienceInfo.segmentName);
    const reach = await this.predictReach(audienceInfo.segmentName);
    const revenue = await this.predictRevenue(audienceInfo.segmentName);
    const conversion = await this.predictConversion(audienceInfo.segmentName);

    return {
      segment: audienceInfo.segmentName,
      reason: audienceInfo.audienceReason,
      channel: channelInfo.channel,
      predictedReach: reach,
      predictedRevenue: revenue,
      predictedConversionRate: conversion,
      message: `Hi {{name}}! Based on our analysis, we recommend this exclusive campaign for you.`
    };
  }
}

export const recommendationService = new RecommendationService();
export default recommendationService;
