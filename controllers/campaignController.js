import { Campaign } from '../models/Campaign.js';
import { Segment } from '../models/Segment.js';
import { Customer } from '../models/Customer.js';
import { Communication } from '../models/Communication.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { channelClient } from '../services/channelClient.js';

/**
 * Create a new Campaign (Draft state)
 * POST /api/v1/campaigns
 */
export const createCampaign = async (req, res, next) => {
  try {
    const { goal, customGoal, segmentId, channel, generatedMessage, predictedReach, predictedRevenue, aiMetadata, useHyperPersonalization } = req.body;

    const segment = await Segment.findById(segmentId);
    if (!segment) {
      throw new NotFoundError('Target segment not found.');
    }

    const campaign = await Campaign.create({
      goal,
      customGoal,
      segmentId,
      channel,
      generatedMessage,
      predictedReach: predictedReach || segment.customerCount,
      predictedRevenue: predictedRevenue || 0,
      aiMetadata: aiMetadata || {},
      useHyperPersonalization: !!useHyperPersonalization,
      status: 'draft'
    });

    return sendSuccess(res, campaign, 'Campaign draft created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Campaigns
 * GET /api/v1/campaigns
 */
export const getAllCampaigns = async (req, res, next) => {
  try {
    const campaigns = await Campaign.find().populate('segmentId').sort({ createdAt: -1 });
    return sendSuccess(res, campaigns, 'Campaigns retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Get Campaign Details by ID
 * GET /api/v1/campaigns/:id
 */
export const getCampaignById = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate('segmentId');
    if (!campaign) {
      throw new NotFoundError('Campaign not found.');
    }
    return sendSuccess(res, campaign, 'Campaign details retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing Campaign (only allowed for draft status campaigns)
 * PUT /api/v1/campaigns/:id
 */
export const updateCampaign = async (req, res, next) => {
  try {
    const { goal, customGoal, segmentId, channel, generatedMessage, predictedReach, predictedRevenue, aiMetadata, useHyperPersonalization, status } = req.body;

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      throw new NotFoundError('Campaign not found.');
    }

    if (campaign.status !== 'draft' && status !== campaign.status) {
      throw new BadRequestError('Cannot update details of a campaign that is already active or completed.');
    }

    if (goal) campaign.goal = goal;
    if (customGoal) campaign.customGoal = customGoal;
    if (channel) campaign.channel = channel;
    if (generatedMessage) campaign.generatedMessage = generatedMessage;
    if (predictedReach !== undefined) campaign.predictedReach = predictedReach;
    if (predictedRevenue !== undefined) campaign.predictedRevenue = predictedRevenue;
    if (aiMetadata) campaign.aiMetadata = { ...campaign.aiMetadata, ...aiMetadata };
    if (useHyperPersonalization !== undefined) campaign.useHyperPersonalization = !!useHyperPersonalization;
    if (status) campaign.status = status;

    if (segmentId) {
      const segment = await Segment.findById(segmentId);
      if (!segment) {
        throw new NotFoundError('Target segment not found.');
      }
      campaign.segmentId = segmentId;
    }

    const updatedCampaign = await campaign.save();
    return sendSuccess(res, updatedCampaign, 'Campaign updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Launch Campaign (Execute segment queries, create communications, mock dispatch)
 * POST /api/v1/campaigns/:id/launch
 */
export const launchCampaign = async (req, res, next) => {
  try {
    // 1. Load Campaign
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      throw new NotFoundError('Campaign not found.');
    }

    if (campaign.status !== 'draft') {
      throw new BadRequestError(`Campaign cannot be launched from status '${campaign.status}'.`);
    }

    // 2. Load Segment
    const segment = await Segment.findById(campaign.segmentId);
    if (!segment) {
      throw new NotFoundError('Target segment associated with campaign not found.');
    }

    // 3. Execute Segment Query & Fetch Customers
    let customers = [];
    try {
      customers = await Customer.find(segment.query);
    } catch (queryErr) {
      throw new BadRequestError(`Failed to execute segment filter query: ${queryErr.message}`);
    }

    if (customers.length === 0) {
      throw new BadRequestError('No matching customers found for this campaign segment.');
    }

    // Transition state to Active
    campaign.status = 'active';
    await campaign.save();

    // 4. Create & Store Communication Records (In background to return response fast)
    setImmediate(async () => {
      console.log(`[CAMPAIGN LAUNCH] Dispatching campaign: ${campaign._id} targeting ${customers.length} users to simulator...`);

      for (const customer of customers) {
        try {
          // Fetch order history for this customer if hyperPersonalization is active
          let orderHistoryText = '';
          if (campaign.useHyperPersonalization) {
            try {
              const OrderModel = mongoose.model('Order');
              const orders = await OrderModel.find({ customerId: customer._id });
              orderHistoryText = orders.map(order => {
                const itemsText = order.items.map(item => `${item.quantity}x ${item.name} ($${item.price} each)`).join(', ');
                return `- Date: ${order.createdAt.toISOString().split('T')[0]}, Items: [${itemsText}], Total: $${order.totalAmount}`;
              }).join('\n');
            } catch (historyErr) {
              console.error(`[CAMPAIGN LAUNCH] Failed to fetch order history for ${customer.email}: ${historyErr.message}`);
            }
          }

          // Generate personalized message or replace {{name}} placeholder
          let finalMessage = campaign.generatedMessage;
          if (campaign.useHyperPersonalization) {
            const { geminiService } = await import('../services/geminiService.js');
            finalMessage = await geminiService.generatePersonalizedMessage(
              customer.name,
              orderHistoryText,
              campaign.goal,
              campaign.generatedMessage
            );
          } else {
            // Replace standard template placeholder
            finalMessage = finalMessage.replace(/\{\{\s*name\s*\}\}/g, customer.name);
          }

          // 5. Create Communication record with initial event history
          const comm = await Communication.create({
            campaignId: campaign._id,
            customerId: customer._id,
            channel: campaign.channel,
            message: finalMessage,
            status: 'sent',
            events: [{ status: 'sent', timestamp: new Date() }]
          });

          // 6. Dispatch to Simulator Client
          const dispatchResult = await channelClient.sendMessage({
            recipient: customer.email || customer.phone,
            customerId: customer._id,
            message: finalMessage,
            channel: campaign.channel,
            communicationId: comm._id
          });

          // 7. If initial dispatch fails, mark communication log as failed
          if (!dispatchResult.success) {
            comm.status = 'failed';
            comm.events.push({
              status: 'failed',
              timestamp: new Date()
            });
            await comm.save();
            console.error(`[CAMPAIGN LAUNCH] Simulator rejected dispatch for communication: ${comm._id}`);
          }
        } catch (err) {
          console.error(`[CAMPAIGN LAUNCH ERROR] Failed to dispatch communication log: ${err.message}`);
        }
      }

      // Automatically transition to completed once all records are generated/mock dispatched
      campaign.status = 'completed';
      await campaign.save();
      console.log(`[CAMPAIGN LAUNCH] Dispatch completed for Campaign: ${campaign._id}.`);
    });

    return sendSuccess(
      res,
      { campaignId: campaign._id, status: 'active', reach: customers.length },
      'Campaign launch process initiated. Messages are being mock dispatched in the background.'
    );
  } catch (error) {
    next(error);
  }
};
