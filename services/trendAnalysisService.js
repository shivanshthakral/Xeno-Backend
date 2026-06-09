import { Order } from '../models/Order.js';
import { Communication } from '../models/Communication.js';
import { Campaign } from '../models/Campaign.js';
import { Customer } from '../models/Customer.js';

class TrendAnalysisService {
  /**
   * Fetch Dynamic Marketing Trends over the past months
   * GET /api/v1/analytics/trends
   */
  async getTrends() {
    const monthsName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Helper to format year-month grouping IDs into strings
    const formatLabel = (group) => {
      if (!group || !group.month) return 'Unknown';
      return `${monthsName[group.month - 1]} ${group.year}`;
    };

    // 1. Monthly Revenue Trend
    const revenueAgg = await Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          total: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    const monthlyRevenue = revenueAgg.map(r => ({
      label: formatLabel(r._id),
      value: Math.round(r.total)
    }));

    // 2. Monthly Conversions Trend
    const conversionsAgg = await Communication.aggregate([
      { $match: { status: 'converted' } },
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    const monthlyConversions = conversionsAgg.map(c => ({
      label: formatLabel(c._id),
      value: c.count
    }));

    // 3. Campaign Growth Trend
    const campaignsAgg = await Campaign.aggregate([
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    const campaignGrowth = campaignsAgg.map(c => ({
      label: formatLabel(c._id),
      value: c.count
    }));

    // 4. Customer Engagement Trend
    const engagementAgg = await Customer.aggregate([
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          avgScore: { $avg: '$engagementScore' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    const engagementTrend = engagementAgg.map(e => ({
      label: formatLabel(e._id),
      value: parseFloat(e.avgScore.toFixed(1))
    }));

    // Fill in default dummy values if aggregates return empty results during dry runs
    return {
      monthlyRevenue: monthlyRevenue.length > 0 ? monthlyRevenue : [{ label: 'Jun 2026', value: 0 }],
      monthlyConversions: monthlyConversions.length > 0 ? monthlyConversions : [{ label: 'Jun 2026', value: 0 }],
      campaignGrowth: campaignGrowth.length > 0 ? campaignGrowth : [{ label: 'Jun 2026', value: 0 }],
      engagementTrend: engagementTrend.length > 0 ? engagementTrend : [{ label: 'Jun 2026', value: 0 }]
    };
  }
}

export const trendAnalysisService = new TrendAnalysisService();
export default trendAnalysisService;
