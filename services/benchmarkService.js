import { Campaign } from '../models/Campaign.js';
import { Communication } from '../models/Communication.js';
import { analyticsService } from './analyticsService.js';
import { NotFoundError } from '../utils/errors.js';

class BenchmarkService {
  /**
   * Compare a campaign against system averages, the best campaign, and the preceding campaign
   * @param {string} campaignId - Target Campaign ID
   */
  async getCampaignBenchmark(campaignId) {
    const currentCampaign = await Campaign.findById(campaignId);
    if (!currentCampaign) {
      throw new NotFoundError(`Campaign with ID ${campaignId} not found.`);
    }

    // 1. Compile current campaign metrics
    const currentMetricsResult = await analyticsService.getCampaignMetrics(campaignId);
    const currentMetrics = currentMetricsResult.metrics;

    // Helper to extract rates profile from metrics
    const getRatesProfile = (m) => ({
      sent: m.sent,
      deliveryRate: m.deliveryRate || 0,
      openRate: m.openRate || 0,
      ctr: m.ctr || 0,
      conversionRate: m.conversionRate || 0,
      converted: m.converted || 0
    });

    const currentProfile = getRatesProfile(currentMetrics);

    // 2. Fetch VS Average campaign benchmarks
    const allCampaigns = await Campaign.find({ status: 'completed' });
    
    let avgProfile = { sent: 0, deliveryRate: 0, openRate: 0, ctr: 0, conversionRate: 0, converted: 0 };
    if (allCampaigns.length > 0) {
      let totalSent = 0;
      let totalDelivered = 0;
      let totalOpened = 0;
      let totalClicked = 0;
      let totalConverted = 0;

      for (const camp of allCampaigns) {
        const comms = await Communication.find({ campaignId: camp._id });
        comms.forEach(comm => {
          const status = comm.status;
          totalSent++;
          if (status === 'delivered') totalDelivered++;
          else if (status === 'opened') { totalDelivered++; totalOpened++; }
          else if (status === 'clicked') { totalDelivered++; totalOpened++; totalClicked++; }
          else if (status === 'converted') { totalDelivered++; totalOpened++; totalClicked++; totalConverted++; }
        });
      }

      if (totalSent > 0) {
        avgProfile = {
          sent: Math.round(totalSent / allCampaigns.length),
          deliveryRate: parseFloat(((totalDelivered / totalSent) * 100).toFixed(2)),
          openRate: parseFloat(((totalOpened / totalSent) * 100).toFixed(2)),
          ctr: parseFloat(((totalClicked / totalSent) * 100).toFixed(2)),
          conversionRate: parseFloat(((totalConverted / totalSent) * 100).toFixed(2)),
          converted: Math.round(totalConverted / allCampaigns.length)
        };
      }
    }

    // 3. Fetch VS Best campaign benchmarks
    let bestProfile = { ...currentProfile };
    let bestCampaignId = campaignId;
    let maxConvRate = currentProfile.conversionRate;

    for (const camp of allCampaigns) {
      const metricsRes = await analyticsService.getCampaignMetrics(camp._id);
      const convRate = metricsRes.metrics.conversionRate;
      if (convRate > maxConvRate) {
        maxConvRate = convRate;
        bestCampaignId = camp._id;
        bestProfile = getRatesProfile(metricsRes.metrics);
      }
    }

    // 4. Fetch VS Previous campaign benchmarks
    let prevProfile = { sent: 0, deliveryRate: 0, openRate: 0, ctr: 0, conversionRate: 0, converted: 0 };
    const prevCampaign = await Campaign.findOne({
      createdAt: { $lt: currentCampaign.createdAt },
      status: 'completed'
    }).sort({ createdAt: -1 });

    if (prevCampaign) {
      const prevMetricsRes = await analyticsService.getCampaignMetrics(prevCampaign._id);
      prevProfile = getRatesProfile(prevMetricsRes.metrics);
    }

    // Helper to compute differences (Current - Benchmark)
    const computeDiff = (current, benchmark) => ({
      sentDiff: current.sent - benchmark.sent,
      deliveryRateDiff: parseFloat((current.deliveryRate - benchmark.deliveryRate).toFixed(2)),
      openRateDiff: parseFloat((current.openRate - benchmark.openRate).toFixed(2)),
      ctrDiff: parseFloat((current.ctr - benchmark.ctr).toFixed(2)),
      conversionRateDiff: parseFloat((current.conversionRate - benchmark.conversionRate).toFixed(2)),
      convertedDiff: current.converted - benchmark.converted
    });

    return {
      vsAverage: {
        benchmark: avgProfile,
        differences: computeDiff(currentProfile, avgProfile)
      },
      vsBest: {
        benchmark: bestProfile,
        differences: computeDiff(currentProfile, bestProfile)
      },
      vsPrevious: {
        benchmark: prevProfile,
        differences: computeDiff(currentProfile, prevProfile)
      }
    };
  }
}

export const benchmarkService = new BenchmarkService();
export default benchmarkService;
