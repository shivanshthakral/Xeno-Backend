import { Communication } from '../models/Communication.js';
import { Customer } from '../models/Customer.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

/**
 * Handle delivery webhook callbacks from simulator service
 * POST /api/v1/communications/receipt
 */
export const receiveReceipt = async (req, res, next) => {
  try {
    const { communicationId, status } = req.body;

    if (!communicationId || !status) {
      throw new BadRequestError('communicationId and status are required fields.');
    }

    const comm = await Communication.findById(communicationId);
    if (!comm) {
      throw new NotFoundError(`Communication record with ID ${communicationId} not found.`);
    }

    // Push new status transition event into logs
    comm.status = status;
    comm.events.push({
      status,
      timestamp: new Date()
    });

    await comm.save();
    console.log(`[CALLBACK WEBHOOK] Receipt processed: Communication ${communicationId} updated status to ${status}.`);

    // Emit Socket.io event after successful DB update
    try {
      const io = req.app.get('socketio');
      if (io) {
        io.emit('communication_update', comm);
      }
    } catch (ioErr) {
      console.error(`[SOCKET IO ERROR] Failed to emit receipt update: ${ioErr.message}`);
    }

    // Asynchronously update customer CRM intelligence metrics based on status callbacks
    setImmediate(async () => {
      try {
        const customer = await Customer.findById(comm.customerId);
        if (customer) {
          let updated = false;

          if (status === 'opened') {
            customer.lastCampaignOpened = comm.campaignId;
            customer.engagementScore = Math.min(customer.engagementScore + 5, 100);
            updated = true;
          } else if (status === 'clicked') {
            customer.lastCampaignClicked = comm.campaignId;
            customer.engagementScore = Math.min(customer.engagementScore + 10, 100);
            updated = true;
          } else if (status === 'converted') {
            customer.engagementScore = Math.min(customer.engagementScore + 15, 100);
            updated = true;
          }

          if (updated) {
            await customer.save();
            console.log(`[CRM INTEL] Updated metrics for customer ${customer.email}: Score=${customer.engagementScore}`);
          }
        }
      } catch (err) {
        console.error(`[CRM INTEL ERROR] Failed to update customer metrics: ${err.message}`);
      }
    });

    return sendSuccess(res, { communicationId, status }, 'Communication receipt registered successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Communication Logs (Authenticated)
 * GET /api/v1/communications
 */
export const getAllCommunications = async (req, res, next) => {
  try {
    const comms = await Communication.find()
      .populate('customerId', 'name email phone')
      .populate('campaignId', 'goal channel status')
      .sort({ createdAt: -1 });

    return sendSuccess(res, comms, 'Communication logs retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Get Communication Details by ID (Authenticated)
 * GET /api/v1/communications/:id
 */
export const getCommunicationById = async (req, res, next) => {
  try {
    const comm = await Communication.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('campaignId', 'goal channel status');

    if (!comm) {
      throw new NotFoundError('Communication record not found.');
    }

    return sendSuccess(res, comm, 'Communication details retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Get Communication Logs belonging to a specific Campaign
 * GET /api/v1/campaigns/:id/communications
 */
export const getCampaignCommunications = async (req, res, next) => {
  try {
    const campaignId = req.params.id;
    const comms = await Communication.find({ campaignId })
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 });

    return sendSuccess(res, comms, 'Campaign communications retrieved successfully.');
  } catch (error) {
    next(error);
  }
};
