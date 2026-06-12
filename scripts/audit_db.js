import mongoose from 'mongoose';
import 'dotenv/config';

import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { Segment } from '../models/Segment.js';
import { Campaign } from '../models/Campaign.js';
import { Communication } from '../models/Communication.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://shivanshthakral03_db_user:mYMlUp2YkUWJqnkd@cluster0.10fxtqy.mongodb.net/xenodb?appName=Cluster0';

async function runAudit() {
  console.log('\x1b[36m%s\x1b[0m', '=== STARTING DATABASE CONSISTENCY AUDIT ===');
  
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[AUDIT] Connected to MongoDB database successfully.');

    // 1. Gather Collections Metrics
    const customerCount = await Customer.countDocuments();
    const orderCount = await Order.countDocuments();
    const segmentCount = await Segment.countDocuments();
    const campaignCount = await Campaign.countDocuments();
    const communicationCount = await Communication.countDocuments();

    console.log('\n[AUDIT] Collection Document Counts:');
    console.log(`- Customers: ${customerCount}`);
    console.log(`- Orders: ${orderCount}`);
    console.log(`- Segments: ${segmentCount}`);
    console.log(`- Campaigns: ${campaignCount}`);
    console.log(`- Communications: ${communicationCount}`);

    let issuesCount = 0;
    const issuesList = [];

    // 2. Audit Orders -> Customers Relationship
    console.log('\n[AUDIT] Scanning Orders for orphaned records...');
    const orders = await Order.find();
    for (const order of orders) {
      if (!order.customerId) {
        issuesCount++;
        issuesList.push(`Order ID ${order._id} is missing a customerId reference.`);
        continue;
      }
      const customerExists = await Customer.exists({ _id: order.customerId });
      if (!customerExists) {
        issuesCount++;
        issuesList.push(`Order ID ${order._id} points to non-existent Customer ID ${order.customerId}.`);
      }
    }

    // 3. Audit Campaigns -> Segments Relationship
    console.log('[AUDIT] Scanning Campaigns for orphaned records...');
    const campaigns = await Campaign.find();
    for (const campaign of campaigns) {
      if (!campaign.segmentId) {
        issuesCount++;
        issuesList.push(`Campaign ID ${campaign._id} ("${campaign.goal}") is missing a segmentId reference.`);
        continue;
      }
      const segmentExists = await Segment.exists({ _id: campaign.segmentId });
      if (!segmentExists) {
        issuesCount++;
        issuesList.push(`Campaign ID ${campaign._id} ("${campaign.goal}") points to non-existent Segment ID ${campaign.segmentId}.`);
      }
    }

    // 4. Audit Communications -> Campaigns & Customers Relationships
    console.log('[AUDIT] Scanning Communications for orphaned records...');
    const communications = await Communication.find();
    for (const comm of communications) {
      if (!comm.campaignId) {
        issuesCount++;
        issuesList.push(`Communication ID ${comm._id} is missing a campaignId reference.`);
      } else {
        const campaignExists = await Campaign.exists({ _id: comm.campaignId });
        if (!campaignExists) {
          issuesCount++;
          issuesList.push(`Communication ID ${comm._id} points to non-existent Campaign ID ${comm.campaignId}.`);
        }
      }

      if (!comm.customerId) {
        issuesCount++;
        issuesList.push(`Communication ID ${comm._id} is missing a customerId reference.`);
      } else {
        const customerExists = await Customer.exists({ _id: comm.customerId });
        if (!customerExists) {
          issuesCount++;
          issuesList.push(`Communication ID ${comm._id} points to non-existent Customer ID ${comm.customerId}.`);
        }
      }

      // Check event history array consistency
      if (!comm.events || !Array.isArray(comm.events) || comm.events.length === 0) {
        issuesCount++;
        issuesList.push(`Communication ID ${comm._id} has empty or malformed events history.`);
      }
    }

    // 5. Output Audit Result Report
    console.log('\n=============================================');
    if (issuesCount === 0) {
      console.log('\x1b[32m%s\x1b[0m', '✅ AUDIT PASSED: Database is 100% consistent with zero orphaned records.');
    } else {
      console.log('\x1b[31m%s\x1b[0m', `❌ AUDIT FAILED: Found ${issuesCount} inconsistency issues:`);
      issuesList.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }
    console.log('=============================================\n');

    await mongoose.connection.close();
    process.exit(issuesCount === 0 ? 0 : 1);
  } catch (error) {
    console.error(`\n[AUDIT ERROR] Audit execution failed: ${error.message}`);
    process.exit(1);
  }
}

runAudit();
