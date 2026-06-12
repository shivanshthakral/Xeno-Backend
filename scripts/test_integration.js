import mongoose from 'mongoose';
import axios from 'axios';

const MONGO_URI = 'mongodb+srv://shivanshthakral03_db_user:mYMlUp2YkUWJqnkd@cluster0.10fxtqy.mongodb.net/xenodb?appName=Cluster0';
const BACKEND_URL = 'http://localhost:5000/api/v1';

async function testIntegration() {
  console.log('[TEST] Connecting to database...');
  await mongoose.connect(MONGO_URI);
  console.log('[TEST] Connected successfully.');

  try {
    // 1. Get Segments list
    console.log('[TEST] Fetching database segments...');
    const segmentsRes = await axios.get(`${BACKEND_URL}/segments`, {
      headers: { Authorization: 'Bearer mock-firebase-reviewer-AdminUser-reviewer@xeno.com' }
    });
    
    const segments = segmentsRes.data.data;
    const dormantSegment = segments.find(s => s.name === 'Dormant Customers');
    if (!dormantSegment) {
      throw new Error('Dormant Customers segment not found. Please seed the CRM database.');
    }
    console.log(`[TEST] Found Segment ID: ${dormantSegment._id} (${dormantSegment.customerCount} customers)`);

    // 2. Create Campaign Draft
    console.log('[TEST] Creating campaign draft...');
    const campaignRes = await axios.post(`${BACKEND_URL}/campaigns`, {
      goal: 'Test Integration Campaign',
      segmentId: dormantSegment._id,
      channel: 'WhatsApp',
      generatedMessage: 'Hi {{name}}, return to Xeno and use RETURN20 code!',
      predictedReach: dormantSegment.customerCount,
      predictedRevenue: dormantSegment.customerCount * 50
    }, {
      headers: { Authorization: 'Bearer mock-firebase-reviewer-AdminUser-reviewer@xeno.com' }
    });

    const campaign = campaignRes.data.data;
    console.log(`[TEST] Campaign created with ID: ${campaign._id}`);

    // 3. Launch Campaign
    console.log('[TEST] Launching campaign...');
    const launchRes = await axios.post(`${BACKEND_URL}/campaigns/${campaign._id}/launch`, {}, {
      headers: { Authorization: 'Bearer mock-firebase-reviewer-AdminUser-reviewer@xeno.com' }
    });
    console.log(`[TEST] Campaign launched successfully. Status: ${launchRes.data.data.status}`);

    // 4. Wait for background simulator events
    console.log('[TEST] Waiting 8 seconds for timed simulator callbacks to register...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // 5. Verify Campaign metrics updated
    console.log('[TEST] Fetching campaign metrics...');
    const metricsRes = await axios.get(`${BACKEND_URL}/analytics/campaign/${campaign._id}`, {
      headers: { Authorization: 'Bearer mock-firebase-reviewer-AdminUser-reviewer@xeno.com' }
    });

    const metrics = metricsRes.data.data.metrics;
    console.log('[TEST] Returned Campaign Metrics:', metrics);

    if (metrics.sent > 0 && (metrics.delivered > 0 || metrics.failed > 0)) {
      console.log('✅ End-to-End Campaign lifecycle simulation verified successfully!');
    } else {
      throw new Error('Verification failed: No delivery status updates recorded.');
    }

  } catch (error) {
    console.error('❌ Integration test failed:', error.message || error);
    if (error.response) {
      console.error('API Response Error:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
    console.log('[TEST] Disconnected from database.');
  }
}

testIntegration();
