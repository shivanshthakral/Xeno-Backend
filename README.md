# Xeno Core API Engine: Backend Documentation

Welcome to the backend engineering documentation for the **Xeno Growth Intelligence Platform**. This service operates as the central data-ingestion engine, segmentation manager, and AI strategy coordinator.

---

## 1. Service Overview

The Xeno Backend is a RESTful Express.js service written in modular JavaScript, powered by MongoDB Atlas, and integrated with Google Gemini 1.5 Flash. It orchestrates:
- Real-time client and order processing.
- Dynamic segment cohort execution.
- LLM prompt strategizing and hyper-personalization message copywriting.
- Asynchronous webhook log lifecycle monitoring.
- Closed-loop metric updates (dynamic customer engagement adjustments).

---

## 2. Architecture & Service Flow

The backend communicates with MongoDB, Gemini API, and the Channel Simulator via three main loops:

```
+-------------------------------------------------------------------------+
|                              EXPRESS SERVER                             |
|                                                                         |
|  [Auth API]   [Customer API]   [Segments API]   [Campaigns API] [AI API]|
+-------+--------------+---------------+----------------+------------+----+
        |              |               |                |            |
        v              v               v                v            v
  +-----------+  +-----------+  +-------------+  +-------------+ +---+----+
  | JWT Auth  |  | Profiles  |  | Query Exec  |  | Queue Launch| | Gemini |
  +-----------+  +-----------+  +-------------+  +------+------+ +--------+
                                                        |
                                                        | (Async Post-Batch)
                                                        v
                                                 +------+------+
                                                 | Webhook     |
                                                 | Callback    |
                                                 | Simulator   |
                                                 +-------------+
```

---

## 3. Folder Structure

```
backend/
├── config/             # DB and client configuration files
├── controllers/        # Request handlers (auth, campaign, segment, etc.)
├── middlewares/        # JWT validators & error handlers
├── models/             # Mongoose schemas (Customer, Order, etc.)
├── routes/             # Express route mappings
├── scripts/            # Database auditing and seeding scripts
├── services/           # Gemini, analytics, and business logic calculations
├── utils/              # Token builders and validation helpers
├── server.js           # App entry point
└── README.md           # This documentation file
```

---

## 4. Authentication Flow

Xeno provides three secure authentication methods:

### JWT Flow
Standard user accounts submit passwords via `/api/v1/auth/login`. On verification, the server signs a JSON Web Token containing the user's `ObjectId` and roles. Subsequent API calls authenticate by passing this token in the `Authorization: Bearer <token>` header.

### Firebase Flow
Enables federated credential verification. The client logs in with Firebase and passes the ID token. The backend verifies the signature against Firebase Auth keys to resolve or register the customer.

### Reviewer Sandbox Flow
A secure reviewer bypass for sandbox evaluation. Sending the specific sandbox token:
`mock-firebase-reviewer-AdminUser-reviewer@xeno.com`
bypasses database lookups. It logs the user in under a default reviewer profile with read-write access to the database to inspect features safely.

---

## 5. Database Models & Schema Definitions

All models are defined using Mongoose in [backend/models/](file:///d:/Xeno/backend/models/):

### Customer Schema
Stores customer profiles and engagement indices.
```javascript
{
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, select: false },
  phone: { type: String },
  engagementScore: { type: Number, default: 0, min: 0, max: 100 },
  customerLifetimeValue: { type: Number, default: 0 },
  segmentTags: [{ type: String }],
  lastCampaignOpened: { type: Schema.Types.ObjectId, ref: 'Campaign' },
  lastCampaignClicked: { type: Schema.Types.ObjectId, ref: 'Campaign' }
}
```

### Order Schema
Manages client transactions and updates customer lifetime value (CLV) via post-save middleware hooks.
```javascript
{
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed'] }
}
```

### Segment Schema
Stores customer segments.
```javascript
{
  name: { type: String, unique: true, required: true },
  description: { type: String },
  query: { type: Schema.Types.Mixed, required: true }, // The MongoDB JSON query object
  customerCount: { type: Number, default: 0 },
  generatedByAI: { type: Boolean, default: false }
}
```

### Campaign Schema
Stores marketing campaigns.
```javascript
{
  goal: { type: String, required: true },
  segmentId: { type: Schema.Types.ObjectId, ref: 'Segment', required: true },
  channel: { type: String, enum: ['Email', 'SMS', 'WhatsApp', 'RCS'], required: true },
  generatedMessage: { type: String, required: true }, // Contains {{name}} variable placeholders
  predictedReach: { type: Number },
  predictedRevenue: { type: Number },
  status: { type: String, enum: ['draft', 'active', 'completed'], default: 'draft' },
  useHyperPersonalization: { type: Boolean, default: false }
}
```

### Communication Schema
Detailed event logs for tracking communications.
```javascript
{
  campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  channel: { type: String, enum: ['Email', 'SMS', 'WhatsApp', 'RCS'], required: true },
  message: { type: String },
  status: { type: String, enum: ['sent', 'delivered', 'opened', 'clicked', 'converted', 'failed'] },
  events: [{
    status: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
}
```

---

## 6. API Endpoint Reference

### Authentication APIs

#### `POST /api/v1/auth/register`
* **Description**: Register a new CRM user.
* **Authentication**: None.
* **Request Payload**:
  ```json
  {
    "name": "Shivansh",
    "email": "shivansh@example.com",
    "password": "securepassword123",
    "phone": "+919876543210"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "_id": "603f7e5f32d8471b443b7e8d",
        "name": "Shivansh",
        "email": "shivansh@example.com",
        "phone": "+919876543210"
      }
    }
  }
  ```

#### `POST /api/v1/auth/login`
* **Description**: Authenticate and retrieve token.
* **Authentication**: None.
* **Request Payload**:
  ```json
  {
    "email": "shivansh@example.com",
    "password": "securepassword123"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "_id": "603f7e5f32d8471b443b7e8d",
        "name": "Shivansh",
        "email": "shivansh@example.com"
      }
    }
  }
  ```

---

### Segment & Query APIs

#### `POST /api/v1/segments/generate`
* **Description**: Translate natural language descriptions into MongoDB filters.
* **Authentication**: Required (JWT).
* **Request Payload**:
  ```json
  {
    "description": "Shoppers with LTV above 1000 rupees and high engagement"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "name": "LTV above 1000 and High Engagement",
      "query": {
        "customerLifetimeValue": { "$gt": 1000 },
        "engagementScore": { "$gte": 70 }
      },
      "description": "Customer query generated by AI based on: Shoppers with LTV above 1000 rupees and high engagement"
    }
  }
  ```

---

### Campaign & AI Dispatch APIs

#### `POST /api/v1/ai/generate-campaign`
* **Description**: Generate a complete campaign strategy from a prompt goal.
* **Authentication**: Required (JWT).
* **Request Payload**:
  ```json
  {
    "goal": "Reengage users who registered but haven't placed an order"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "goal": "Reengage users who registered but haven't placed an order",
      "channel": "Email",
      "generatedMessage": "Hi {{name}}, we noticed you haven't placed your first order yet. Use code FIRST15 for 15% off!",
      "predictedReach": 120,
      "predictedRevenue": 18000,
      "aiMetadata": {
        "audienceReason": "Identifies registered accounts with 0 customer lifetime value.",
        "channelReason": "Email permits detailed body text and custom code embeds.",
        "confidenceScore": 88
      }
    }
  }
  ```

#### `POST /api/v1/campaigns/:id/launch`
* **Description**: Launch a campaign and start simulator dispatches.
* **Authentication**: Required (JWT).
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Campaign launch initiated successfully for 120 customers."
  }
  ```

---

### Webhook API

#### `POST /api/v1/communications/receipt`
* **Description**: Callback endpoint for simulator events.
* **Authentication**: None (Secret validation verify recommended).
* **Request Payload**:
  ```json
  {
    "communicationId": "603f7e5f32d8471b443b7e9a",
    "status": "clicked",
    "timestamp": "2026-06-12T06:40:00.000Z"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Status updated successfully. Customer engagement adjusted."
  }
  ```

---

## 7. Communication Lifecycle Engine

The callback system handles communications through a multi-stage flow:

```
[Campaign Launch]
        |
        v
  [Create Comms Logs] (status: sent)
        |
        +---> [Call Simulator] (Port 5001)
                    |
                    +---> (Async delay: 1s-6s)
                                |
                                v
                    [Simulate Event Webhooks] (delivered -> opened -> clicked -> converted)
                                |
                                v
                    [POST backend/receipt]
                                |
                                v
                    [Update Mongoose DB] ---> [Adjust Engagement Score]
```

Every database update logs the transition timestamp in the `events` array, preserving a complete audit trail.

---

## 8. Closed-Loop Analytics Engine Calculations

Analytical calculations update dynamically:
* **Customer Lifetime Value (CLV)**: middleware sums successful orders.
  $$\text{CLV} = \sum \text{Order.totalAmount} \quad \text{where } \text{paymentStatus} = \text{"Paid"}$$
* **Engagement Score Adjustment**:
  * **Open Event**: Adds `+5` points.
  * **Click Event**: Adds `+10` points.
  * **Conversion Event**: Adds `+15` points.
  * *All metrics are capped between 0 and 100.*

---

## 9. Security

* **JWT Verification**: Validates expiration and claims on protected routes.
* **Sanitized Queries**: Parses AI segment outputs before execution to block MongoDB operator injections (e.g. preventing `$where` functions).
* **CORS Settings**: Restricts endpoint access to registered domains.

---

## 10. Environment Variables

Create `backend/.env` with:
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/xeno
JWT_SECRET=your_jwt_secret_here
GEMINI_API_KEY=AIzaSyYourGeminiKey
FRONTEND_URL=http://localhost:3000
SIMULATOR_URL=http://localhost:5001
```

---

## 11. Deployment Guide

To deploy the backend service (e.g. to Render, AWS, or Heroku):

1. **Database Set Up**: Set up a MongoDB Atlas cluster.
2. **Environment Variables**: Configure all variables in your hosting provider's dashboard.
3. **Start Command**: Set the start command to:
   ```bash
   node server.js
   ```

---

## 12. Scaling Considerations

* **Rate Limiting**: Add IP rate limiting on key endpoints.
* **Worker Threads**: Offload batch campaign dispatches to worker processes (e.g., using BullMQ and Redis) for bulk campaigns (>10,000 users).
* **Database Indexes**: Index the fields `{ campaignId: 1, status: 1 }` to keep funnel calculations fast as data scales.
