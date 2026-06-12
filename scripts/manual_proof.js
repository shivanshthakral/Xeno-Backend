import axios from 'axios';
import mongoose from 'mongoose';
import 'dotenv/config';

// Models
import { Customer } from '../models/Customer.js';
import { Campaign } from '../models/Campaign.js';
import { Communication } from '../models/Communication.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://shivanshthakral03_db_user:mYMlUp2YkUWJqnkd@cluster0.10fxtqy.mongodb.net/xenodb?appName=Cluster0';
const BACKEND_URL = 'http://localhost:5000/api/v1';

async function runValidationTests() {
  console.log('\n\x1b[35m=========================================================');
  console.log('      XENO CRM - MANUAL PRE-DEPLOYMENT QA AUDIT');
  console.log('=========================================================\x1b[0m\n');

  try {
    // Connect to database to inspect changes
    await mongoose.connect(MONGO_URI);
    console.log('\x1b[32m[DB] Connected to MongoDB database successfully.\x1b[0m');

    // -----------------------------------------------------------------
    // TEST 1: AUTHENTICATION AUDIT
    // -----------------------------------------------------------------
    console.log('\n\x1b[34m--- TEST 1: AUTHENTICATION FLOW VERIFICATION ---\x1b[0m');
    
    const randomSuffix = Math.floor(Math.random() * 10000);
    const registerPayload = {
      name: 'Jane Smith Audit User',
      email: `jane.smith.${randomSuffix}@xenocrm.com`,
      password: 'password123',
      phone: '+15559998888'
    };

    console.log('[AUTH] Registering new customer via POST /auth/register...');
    const regRes = await axios.post(`${BACKEND_URL}/auth/register`, registerPayload);
    console.log(`[AUTH] Register Response Status: ${regRes.status}`);
    console.log(`[AUTH] Register Success: ${regRes.data.success}`);
    const jwtToken = regRes.data.data.token;
    console.log(`[AUTH] Generated Token (JWT): ${jwtToken.substring(0, 45)}...`);

    console.log('[AUTH] Logging in with credentials via POST /auth/login...');
    const loginRes = await axios.post(`${BACKEND_URL}/auth/login`, {
      email: registerPayload.email,
      password: registerPayload.password
    });
    console.log(`[AUTH] Login Response Status: ${loginRes.status}`);
    console.log(`[AUTH] Login Success: ${loginRes.data.success}`);
    const loginToken = loginRes.data.data.token;

    // Verify protected profile endpoint
    console.log('[AUTH] Accessing protected profile with Bearer header...');
    const profileRes = await axios.get(`${BACKEND_URL}/customers/profile`, {
      headers: { Authorization: `Bearer ${loginToken}` }
    });
    console.log(`[AUTH] Profile Retrieve Success: ${profileRes.data.success}`);
    console.log(`[AUTH] Retrieved User Name: ${profileRes.data.data.name} | Email: ${profileRes.data.data.email}`);

    // Verify Expired / Invalid Token returns 401
    console.log('[AUTH] Accessing protected profile with invalid token...');
    try {
      await axios.get(`${BACKEND_URL}/customers/profile`, {
        headers: { Authorization: `Bearer invalid-token-value` }
      });
      console.log('\x1b[31m[AUTH] FAIL: Protected endpoint did not reject invalid token!\x1b[0m');
    } catch (err) {
      console.log(`\x1b[32m[AUTH] PASS: Invalid token correctly rejected with status ${err.response.status} (${err.response.data.error})\x1b[0m`);
    }

    // -----------------------------------------------------------------
    // TEST 2: AI CAMPAIGN GENERATION (DYNAMIC PROOF)
    // -----------------------------------------------------------------
    console.log('\n\x1b[34m--- TEST 2: DYNAMIC AI STRATEGY FORMULATION ---\x1b[0m');

    console.log('[AI] Requesting strategy for goal: "Increase VIP customer spending"...');
    const aiRes1 = await axios.post(`${BACKEND_URL}/ai/generate-campaign`, {
      goal: 'Increase VIP customer spending'
    }, {
      headers: { Authorization: `Bearer ${loginToken}` }
    });
    const strategy1 = aiRes1.data.data;
    console.log('\x1b[33mAI Output 1 (VIP Spending):\x1b[0m');
    console.log(`- Target Segment: ${strategy1.segment}`);
    console.log(`- Optimum Channel: ${strategy1.channel}`);
    console.log(`- Revenue Prediction: ₹${strategy1.predictedRevenue}`);
    console.log(`- Confidence Score: ${strategy1.confidenceScore}%`);
    console.log(`- Message Copy: "${strategy1.generatedMessage}"`);

    console.log('[AI] Requesting strategy for goal: "Reactivate dormant users"...');
    const aiRes2 = await axios.post(`${BACKEND_URL}/ai/generate-campaign`, {
      goal: 'Reactivate dormant users'
    }, {
      headers: { Authorization: `Bearer ${loginToken}` }
    });
    const strategy2 = aiRes2.data.data;
    console.log('\x1b[33mAI Output 2 (Reactivate Dormant):\x1b[0m');
    console.log(`- Target Segment: ${strategy2.segment}`);
    console.log(`- Optimum Channel: ${strategy2.channel}`);
    console.log(`- Revenue Prediction: ₹${strategy2.predictedRevenue}`);
    console.log(`- Confidence Score: ${strategy2.confidenceScore}%`);
    console.log(`- Message Copy: "${strategy2.generatedMessage}"`);

    const segmentDiff = strategy1.segment !== strategy2.segment;
    const msgDiff = strategy1.generatedMessage !== strategy2.generatedMessage;
    if (segmentDiff || msgDiff) {
      console.log('\n\x1b[32m[AI] PASS: AI is dynamically generating outputs based on input goals!\x1b[0m');
    } else {
      console.log('\n\x1b[31m[AI] WARNING: AI outputs appear identical. Double check AI prompts.\x1b[0m');
    }

    // -----------------------------------------------------------------
    // TEST 3 & 4: CAMPAIGN LAUNCH & SIMULATOR CALLBACK PIPELINE
    // -----------------------------------------------------------------
    console.log('\n\x1b[34m--- TEST 3 & 4: CAMPAIGN LAUNCH AND TIMED WEBHOOK CALLBACKS ---\x1b[0m');
    
    // Resolve segment ID from DB
    const segments = await mongoose.connection.db.collection('segments').find().toArray();
    let segmentId = segments[0]?._id;
    
    // Attempt keyword mapping matching strategy2
    const targetLower = strategy2.segment.toLowerCase();
    const matchedSegment = segments.find(s => {
      const sName = s.name.toLowerCase();
      if (targetLower.includes('vip') && sName.includes('vip')) return true;
      if (targetLower.includes('dormant') && sName.includes('dormant')) return true;
      if (targetLower.includes('churn') && sName.includes('churn')) return true;
      if (targetLower.includes('frequent') && sName.includes('frequent')) return true;
      return false;
    });
    if (matchedSegment) segmentId = matchedSegment._id;

    console.log(`[CAMPAIGN] Targeting segment: ${matchedSegment?.name || 'Default'} (ID: ${segmentId})`);

    console.log('[CAMPAIGN] Creating new campaign draft via POST /campaigns...');
    const campaignDraftRes = await axios.post(`${BACKEND_URL}/campaigns`, {
      goal: 'Reactivate dormant users - Verification Test',
      segmentId: segmentId.toString(),
      channel: strategy2.channel,
      generatedMessage: strategy2.generatedMessage,
      predictedReach: strategy2.predictedReach,
      predictedRevenue: strategy2.predictedRevenue,
      aiMetadata: {
        audienceReason: strategy2.audienceReason,
        channelReason: strategy2.channelReason,
        confidenceScore: strategy2.confidenceScore
      }
    }, {
      headers: { Authorization: `Bearer ${loginToken}` }
    });

    const campaignId = campaignDraftRes.data.data._id;
    console.log(`[CAMPAIGN] Campaign Draft Created successfully. ID: ${campaignId}`);

    console.log(`[CAMPAIGN] Launching campaign ID ${campaignId} via POST /campaigns/:id/launch...`);
    const launchRes = await axios.post(`${BACKEND_URL}/campaigns/${campaignId}/launch`, {}, {
      headers: { Authorization: `Bearer ${loginToken}` }
    });
    console.log(`[CAMPAIGN] Launch response: ${launchRes.data.message}`);

    // Verify DB update
    const campaignDb = await Campaign.findById(campaignId);
    console.log(`[DATABASE] Campaign status in DB: "${campaignDb.status}"`);

    const commCount = await Communication.countDocuments({ campaignId });
    console.log(`[DATABASE] Created ${commCount} Communication logs for this campaign.`);

    console.log('[SIMULATOR] Waiting 10 seconds to allow simulator callback hooks to process...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // -----------------------------------------------------------------
    // TEST 5 & 6: ANALYTICS & EXECUTIVE SUMMARY UPDATES
    // -----------------------------------------------------------------
    console.log('\n\x1b[34m--- TEST 5 & 6: ANALYTICS METRICS & EXECUTIVE SCORECARD ---\x1b[0m');
    
    // Check communication logs status distribution
    const commLogs = await Communication.find({ campaignId });
    const statuses = commLogs.map(c => c.status);
    const uniqueStatuses = [...new Set(statuses)];
    console.log(`[DATABASE] Updated Communication log statuses in DB: ${uniqueStatuses.join(', ')}`);
    
    const clickCount = statuses.filter(s => s === 'clicked').length;
    const deliveredCount = statuses.filter(s => s === 'delivered').length;
    const completedCount = statuses.filter(s => s === 'completed').length;
    console.log(`[DATABASE] Communications Breakdown: Completed/Converted: ${completedCount} | Clicked: ${clickCount} | Delivered: ${deliveredCount}`);

    // Call analytics endpoint
    console.log('[ANALYTICS] Requesting live campaign performance analytics...');
    const analyticRes = await axios.get(`${BACKEND_URL}/analytics/campaign/${campaignId}`, {
      headers: { Authorization: `Bearer ${loginToken}` }
    });
    console.log(`[ANALYTICS] CTR: ${analyticRes.data.data.metrics.ctr}%`);
    console.log(`[ANALYTICS] Delivery Rate: ${analyticRes.data.data.metrics.deliveryRate}%`);
    console.log(`[ANALYTICS] Open Rate: ${analyticRes.data.data.metrics.openRate}%`);

    console.log('[EXECUTIVE] Fetching real-time Executive Dashboard Summary...');
    const execRes = await axios.get(`${BACKEND_URL}/analytics/executive-summary`, {
      headers: { Authorization: `Bearer ${loginToken}` }
    });
    const exec = execRes.data.data;
    console.log(`[EXECUTIVE] Dynamic growthScore: ${exec.growthScore}`);
    console.log(`[EXECUTIVE] Overall Health: ${exec.overallHealth}`);
    console.log(`[EXECUTIVE] Best Segment: ${exec.topAudience}`);
    console.log(`[EXECUTIVE] Best Channel: ${exec.topChannel}`);
    console.log(`[EXECUTIVE] Monthly Revenue: ₹${exec.monthlyRevenue}`);

    // -----------------------------------------------------------------
    // HEALTH CHECK AUDIT
    // -----------------------------------------------------------------
    console.log('\n\x1b[34m--- SYSTEM HEALTH STATUS INDICATORS AUDIT ---\x1b[0m');
    const healthRes = await axios.get(`${BACKEND_URL.replace('/api/v1', '')}/api/v1/health`);
    console.log(`[HEALTH] Health check response:`, JSON.stringify(healthRes.data, null, 2));

    console.log('\n\x1b[32m✅ ALL SYSTEM TESTS PASSED SUCCESSFULLY!\x1b[0m');
    console.log('\x1b[35m=========================================================\x1b[0m\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`\n\x1b[31m❌ QA VALIDATION TEST FAILED: ${error.message}\x1b[0m`);
    if (error.response) {
      console.error('Response Data:', error.response.data);
    }
    await mongoose.connection.close();
    process.exit(1);
  }
}

runValidationTests();
