import axios from 'axios';

/**
 * Client service to communicate with the independent channel-service simulator
 */
class ChannelClient {
  constructor() {
    this.simulatorUrl = process.env.CHANNEL_SERVICE_URL || 'http://localhost:5001';
  }

  /**
   * Dispatch a message to the simulated channel
   * @param {Object} details - Message dispatch parameters
   * @param {string} details.recipient - Recipient identifier (phone or email)
   * @param {string} details.message - Message content string
   * @param {string} details.channel - Channel type (SMS, Email, WhatsApp)
   * @param {string} details.communicationId - ObjectId string for callback tracking
   */
  async sendMessage(details) {
    try {
      const callbackUrl = `http://localhost:5000/api/v1/communications/receipt`;
      
      console.log(`[CHANNEL CLIENT] Dispatching message for communication: ${details.communicationId} to simulator...`);
      
      const response = await axios.post(`${this.simulatorUrl}/send`, {
        recipient: details.recipient,
        message: details.message,
        channel: details.channel,
        communicationId: details.communicationId,
        callbackUrl
      }, {
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error(`[CHANNEL CLIENT ERROR] Failed to send message via simulator: ${error.message}`);
      // Return a simulated mock success or throw based on preference.
      // We will log and proceed so that launching campaign doesn't fail even if simulator is down
      return { success: false, error: error.message };
    }
  }
}

export const channelClient = new ChannelClient();
export default channelClient;
