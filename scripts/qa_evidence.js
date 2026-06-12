import axios from 'axios';
import mongoose from 'mongoose';
import 'dotenv/config';

import { Customer } from '../models/Customer.js';
import { Campaign } from '../models/Campaign.js';
import { Communication } from '../models/Communication.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://shivanshthakral03_db_user:mYMlUp2YkUWJqnkd@cluster0.10fxtqy.mongodb.net/xenodb?appName=Cluster0';
const BACKEND_URL = 'http://localhost:5000/api/v1';

async function generateQaEvidence() {
  console.log('--- STARTING QA EVIDENCE COMPILER ---');
  await mongoose.connect(MONGO_URI);

  const rand = Math.floor(Math.random() * 100000);
  const email = `audit.test.${rand}@xenocrm.com`;
  const registerPayload = {
    name: 'QA Audit User',
    email,
    password: 'password123',
    phone: '+15550001111'
  };

  // 1. Register Test
  console.log('\n[EVIDENCE: REGISTER_REQUEST]');
  console.log(JSON.stringify(registerPayload, null, 2));
  
  const regRes = await axios.post(`${BACKEND_URL}/auth/register`, registerPayload);
  console.log('\n[EVIDENCE: REGISTER_RESPONSE]');
  console.log(JSON.stringify(regRes.data, null, 2));
  const token = regRes.data.data.token;

  // 2. Login Test
  const loginPayload = { email, password: 'password123' };
  console.log('\n[EVIDENCE: LOGIN_REQUEST]');
  console.log(JSON.stringify(loginPayload, null, 2));

  const logRes = await axios.post(`${BACKEND_URL}/auth/login`, loginPayload);
  console.log('\n[EVIDENCE: LOGIN_RESPONSE]');
  console.log(JSON.stringify(logRes.data, null, 2));

  // 3. AI Tests
  const goals = [
    { key: 'Goal A (Repeat Purchases)', text: 'Increase repeat purchases' },
    { key: 'Goal B (Reactivate Dormant)', text: 'Reactivate dormant users' },
    { key: 'Goal C (VIP Spending)', text: 'Increase VIP spending' }
  ];

  for (const g of goals) {
    console.log(`\n[EVIDENCE: AI_REQUEST - ${g.key}]`);
    console.log(JSON.stringify({ goal: g.text }, null, 2));
    const aiRes = await axios.post(`${BACKEND_URL}/ai/generate-campaign`, { goal: g.text }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`\n[EVIDENCE: AI_RESPONSE - ${g.key}]`);
    console.log(JSON.stringify(aiRes.data.data, null, 2));
  }

  // 4. Analytics Before Campaign Launch
  console.log('\n[EVIDENCE: ANALYTICS_BEFORE_LAUNCH]');
  const analyticsBefore = await axios.get(`${BACKEND_URL}/analytics/executive-summary`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(JSON.stringify(analyticsBefore.data.data, null, 2));

  // 5. Campaign Creation & Launch
  const segments = await mongoose.connection.db.collection('segments').find().toArray();
  const dormantSegment = segments.find(s => s.name.includes('Dormant')) || segments[0];

  const campaignPayload = {
    goal: 'QA Verification Campaign - Reactivate Dormant',
    segmentId: dormantSegment._id.toString(),
    channel: 'WhatsApp',
    generatedMessage: 'Hi {{name}}! We miss you. Get 15% off code: MISS15',
    predictedReach: 150,
    predictedRevenue: 1500,
    aiMetadata: {
      audienceReason: 'Reactivate dormant customer segment',
      channelReason: 'High open rates',
      confidenceScore: 80
    }
  };

  console.log('\n[EVIDENCE: CAMPAIGN_CREATE_REQUEST]');
  console.log(JSON.stringify(campaignPayload, null, 2));

  const cCreateRes = await axios.post(`${BACKEND_URL}/campaigns`, campaignPayload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('\n[EVIDENCE: CAMPAIGN_CREATE_RESPONSE]');
  console.log(JSON.stringify(cCreateRes.data, null, 2));
  const campaignId = cCreateRes.data.data._id;

  console.log('\n[EVIDENCE: CAMPAIGN_LAUNCH_REQUEST]');
  console.log(`POST /campaigns/${campaignId}/launch`);

  const cLaunchRes = await axios.post(`${BACKEND_URL}/campaigns/${campaignId}/launch`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('\n[EVIDENCE: CAMPAIGN_LAUNCH_RESPONSE]');
  console.log(JSON.stringify(cLaunchRes.data, null, 2));

  // Find communication document BEFORE callback processing
  console.log('\n[EVIDENCE: COMMUNICATION_BEFORE_CALLBACKS]');
  const commBefore = await Communication.findOne({ campaignId });
  console.log(JSON.stringify(commBefore, null, 2));

  // Wait 10 seconds for callbacks to hit
  console.log('\n[INFO] Waiting 10 seconds for channel simulator webhook callbacks...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Find communication document AFTER callback processing
  console.log('\n[EVIDENCE: COMMUNICATION_AFTER_CALLBACKS]');
  const commAfter = await Communication.findOne({ _id: commBefore._id });
  console.log(JSON.stringify(commAfter, null, 2));

  // Analytics After Campaign Activity
  console.log('\n[EVIDENCE: ANALYTICS_AFTER_LAUNCH]');
  const analyticsAfter = await axios.get(`${BACKEND_URL}/analytics/executive-summary`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(JSON.stringify(analyticsAfter.data.data, null, 2));

  await mongoose.connection.close();
  console.log('\n--- COMPILER COMPLETED ---');
}

generateQaEvidence();
