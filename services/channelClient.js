import axios from 'axios';

class ChannelClient {
  constructor() {
    this.simulatorUrl = process.env.SIMULATOR_URL || process.env.CHANNEL_SERVICE_URL || 'http://localhost:5001';
  }

  /**
   * Dispatch a message to the simulated channel service with retries
   * @param {Object} details - Message dispatch parameters
   * @param {string} details.recipient - Recipient identifier (phone or email)
   * @param {string} details.customerId - Recipient Customer ID
   * @param {string} details.message - Message content string
   * @param {string} details.channel - Channel type (SMS, Email, WhatsApp, RCS)
   * @param {string} details.communicationId - ObjectId string for callback tracking
   * @param {number} maxRetries - Maximum number of retries before throwing error (default 3)
   */
  async sendMessage(details, maxRetries = 3) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    const callbackUrl = `${cleanBackendUrl}/api/v1/communications/receipt`;
    const payload = {
      communicationId: details.communicationId,
      customerId: details.customerId,
      recipient: details.recipient,
      channel: details.channel,
      message: details.message,
      callbackUrl
    };

    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        console.log(`[CHANNEL CLIENT] Sending comm: ${details.communicationId} to simulator (Attempt ${attempt + 1}/${maxRetries + 1})...`);
        
        console.log(
          '[SIMULATOR]',
          'Dispatch URL:',
          `${this.simulatorUrl}/send`
        );
        
        console.log(
          '[SIMULATOR]',
          'Callback URL:',
          callbackUrl
        );

        const response = await axios.post(`${this.simulatorUrl}/send`, payload, {
          timeout: 4000
        });

        console.log(`[CHANNEL CLIENT SUCCESS] Simulator accepted comm: ${details.communicationId} on attempt ${attempt + 1}. Response:`, response.data);
        return { success: true, data: response.data };
      } catch (error) {
        attempt++;
        console.error(`[CHANNEL CLIENT WARNING] Attempt ${attempt} failed for comm ${details.communicationId}: ${error.message}`);
        
        if (attempt > maxRetries) {
          console.error(`[CHANNEL CLIENT ERROR] Max retries exceeded for comm ${details.communicationId}. Marking as failed.`);
          return { success: false, error: error.message };
        }

        // Wait 500ms before next retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
}

export const channelClient = new ChannelClient();
export default channelClient;
