import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { Segment } from '../models/Segment.js';
import { Campaign } from '../models/Campaign.js';
import { Communication } from '../models/Communication.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://shivanshthakral03_db_user:mYMlUp2YkUWJqnkd@cluster0.10fxtqy.mongodb.net/xenodb?appName=Cluster0';

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Robin', 'Jamie', 'Skyler', 'Pat', 'Kim',
  'Chris', 'Sam', 'Ashley', 'Jessica', 'Matthew', 'Andrew', 'David', 'Joseph', 'Sarah', 'Karen',
  'Nancy', 'Lisa', 'Betty', 'Margaret', 'Sandra', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Dorothy',
  'Carol', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia', 'Kathleen',
  'Amy', 'Shirley', 'Angela', 'Helen', 'Anna', 'Brenda', 'Pamela', 'Nicole', 'Ruth', 'Brian'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson',
  'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White',
  'Lopez', 'Lee', 'Gonzalez', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez', 'Hall',
  'Young', 'Allen', 'Sanchez', 'Wright', 'King', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson',
  'Hill', 'Ramirez', 'Campbell', 'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans', 'Turner', 'Torres'
];

const PRODUCTS = [
  { name: 'Wireless Mouse', price: 25 },
  { name: 'Mechanical Keyboard', price: 90 },
  { name: 'USB-C Hub', price: 40 },
  { name: '27-inch Monitor', price: 250 },
  { name: 'Noise Cancelling Headphones', price: 180 },
  { name: 'Leather Notebook', price: 15 },
  { name: 'Desk Pad', price: 30 },
  { name: 'LED Desk Lamp', price: 45 },
  { name: 'Ergonomic Office Chair', price: 350 },
  { name: 'Smart Fitness Tracker', price: 75 }
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedDatabase(options = {}) {
  try {
    if (!options.isFallback) {
      console.log('[SEED] Connecting to MongoDB database...');
      await mongoose.connect(MONGO_URI);
      console.log('[SEED] Connected successfully.');
    } else {
      console.log('[SEED] Running in fallback mode. Reusing existing connection.');
    }

    // Clean up existing database collections
    console.log('[SEED] Cleaning database collections...');
    await Customer.deleteMany({});
    await Order.deleteMany({});
    await Segment.deleteMany({});
    await Campaign.deleteMany({});
    await Communication.deleteMany({});
    console.log('[SEED] Collections cleared.');

    // Pre-hash password for fast generation
    console.log('[SEED] Hashing default password...');
    const defaultPasswordHash = await bcrypt.hash('password123', 12);
    console.log('[SEED] Password hashed.');

    const customersToInsert = [];
    const ordersToInsert = [];

    // Helper to generate customers
    // 500 customers breakdown:
    // - 100 VIP
    // - 150 Dormant
    // - 150 Frequent
    // - 100 Churn Risk
    const totalCustomers = 500;
    
    console.log('[SEED] Generating 500 customers and their orders...');

    for (let i = 1; i <= totalCustomers; i++) {
      const firstName = getRandomElement(FIRST_NAMES);
      const lastName = getRandomElement(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@xenocrm.com`;
      const phone = `+15550100${i.toString().padStart(3, '0')}`;
      
      let group = 'Frequent';
      if (i <= 100) {
        group = 'VIP';
      } else if (i <= 250) {
        group = 'Dormant';
      } else if (i <= 400) {
        group = 'Frequent';
      } else {
        group = 'Churn Risk';
      }

      let engagementScore = 0;
      let segmentTags = [];
      let numOrders = 0;

      if (group === 'VIP') {
        engagementScore = getRandomRange(80, 100);
        segmentTags = ['VIP', 'Loyal'];
        numOrders = getRandomRange(4, 10);
      } else if (group === 'Dormant') {
        engagementScore = getRandomRange(5, 29);
        segmentTags = ['Dormant'];
        numOrders = getRandomRange(0, 1);
      } else if (group === 'Frequent') {
        engagementScore = getRandomRange(50, 79);
        segmentTags = ['Frequent'];
        numOrders = getRandomRange(3, 6);
      } else {
        // Churn Risk
        engagementScore = getRandomRange(0, 19);
        segmentTags = ['Churn Risk'];
        numOrders = getRandomRange(1, 3);
      }

      // Create a Customer ObjectId beforehand so we can link orders to it
      const customerId = new mongoose.Types.ObjectId();

      let calculatedCLV = 0;

      // Generate orders for this customer
      for (let j = 0; j < numOrders; j++) {
        const orderItems = [];
        const numItems = getRandomRange(1, 3);
        
        for (let k = 0; k < numItems; k++) {
          const prod = getRandomElement(PRODUCTS);
          orderItems.push({
            name: prod.name,
            quantity: getRandomRange(1, 2),
            price: prod.price
          });
        }

        const totalAmount = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        
        let paymentStatus = 'Paid';
        let status = 'Delivered';

        if (group === 'Churn Risk' && j === numOrders - 1 && Math.random() > 0.4) {
          // Churn Risk customers might have pending/failed orders
          paymentStatus = Math.random() > 0.5 ? 'Failed' : 'Pending';
          status = 'Cancelled';
        } else if (group === 'Dormant' && numOrders > 0) {
          // Dormant customers orders are all paid but old
          paymentStatus = 'Paid';
          status = 'Delivered';
        }

        if (paymentStatus === 'Paid') {
          calculatedCLV += totalAmount;
        }

        ordersToInsert.push({
          customerId,
          items: orderItems,
          totalAmount,
          status,
          paymentStatus,
          createdAt: group === 'Dormant' 
            ? new Date(Date.now() - getRandomRange(95, 180) * 24 * 60 * 60 * 1000) // 95 to 180 days ago
            : new Date(Date.now() - getRandomRange(1, 90) * 24 * 60 * 60 * 1000)    // 1 to 90 days ago
        });
      }

      customersToInsert.push({
        _id: customerId,
        name,
        email,
        password: defaultPasswordHash,
        phone,
        engagementScore,
        customerLifetimeValue: calculatedCLV,
        segmentTags,
        createdAt: group === 'Dormant'
          ? new Date(Date.now() - getRandomRange(180, 360) * 24 * 60 * 60 * 1000)
          : new Date(Date.now() - getRandomRange(30, 180) * 24 * 60 * 60 * 1000)
      });
    }

    console.log(`[SEED] Inserting ${customersToInsert.length} customer documents...`);
    await Customer.insertMany(customersToInsert);
    console.log('[SEED] Customer documents inserted.');

    console.log(`[SEED] Inserting ${ordersToInsert.length} order documents...`);
    await Order.insertMany(ordersToInsert);
    console.log('[SEED] Order documents inserted.');

    // Seed default segments
    console.log('[SEED] Seeding predefined segments...');
    const defaultSegments = [
      {
        name: 'VIP Customers',
        description: 'Customers with high engagement score (>= 80) and strong lifetime value (>= $1000)',
        query: { customerLifetimeValue: { $gte: 1000 }, engagementScore: { $gte: 80 } },
        customerCount: customersToInsert.filter(c => c.customerLifetimeValue >= 1000 && c.engagementScore >= 80).length,
        generatedByAI: false
      },
      {
        name: 'Dormant Customers',
        description: 'Customers tagged as dormant with no recent purchase activity',
        query: { segmentTags: 'Dormant' },
        customerCount: customersToInsert.filter(c => c.segmentTags.includes('Dormant')).length,
        generatedByAI: false
      },
      {
        name: 'Frequent Buyers',
        description: 'Customers with frequent purchase tags and lifetime value between $300 and $1000',
        query: { segmentTags: 'Frequent', customerLifetimeValue: { $gte: 300, $lt: 1000 } },
        customerCount: customersToInsert.filter(c => c.segmentTags.includes('Frequent') && c.customerLifetimeValue >= 300 && c.customerLifetimeValue < 1000).length,
        generatedByAI: false
      },
      {
        name: 'Churn Risk Customers',
        description: 'Customers displaying extremely low engagement score (< 20)',
        query: { engagementScore: { $lt: 20 } },
        customerCount: customersToInsert.filter(c => c.engagementScore < 20).length,
        generatedByAI: false
      }
    ];

    await Segment.insertMany(defaultSegments);
    console.log('[SEED] Default segments inserted successfully.');
    console.log('[SEED] Seeding operation completed successfully!');
    if (!options.isFallback) {
      process.exit(0);
    }
  } catch (error) {
    console.error(`[SEED ERROR] Seeding process failed: ${error.message}`);
    if (!options.isFallback) {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

export { seedDatabase };

// Run if called directly from CLI
const isMain = process.argv[1] && path.normalize(fileURLToPath(import.meta.url)) === path.normalize(process.argv[1]);
if (isMain) {
  seedDatabase();
}
