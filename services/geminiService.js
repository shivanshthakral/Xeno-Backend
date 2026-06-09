import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

// Initialize the Google Generative AI client
let genAI = null;
if (env.geminiApiKey && env.geminiApiKey !== 'mock_gemini_api_key_for_testing') {
  try {
    genAI = new GoogleGenerativeAI(env.geminiApiKey);
  } catch (err) {
    console.error(`[AI INIT ERROR] Failed to instantiate Google Generative AI: ${err.message}`);
  }
}

/**
 * Gemini Service Layer for text completions and structural JSON generation
 */
class GeminiService {
  /**
   * AI Campaign Strategy Generator
   * POST /api/v1/ai/generate-campaign
   */
  async generateCampaignStrategy(goal) {
    const prompt = `You are a Principal Growth Marketer and AI Growth Agent.
Generate a marketing campaign strategy to achieve the following goal: "${goal}".
Return a JSON object containing exactly the following keys:
{
  "segment": "Segment name based on historical trends",
  "reason": "Clear explanation of why this segment was targeted",
  "channel": "WhatsApp" | "SMS" | "Email",
  "message": "Enclosing message template, use {{name}} for personalisation",
  "predictedReach": 500,
  "predictedRevenue": 15000
}
Do not write markdown syntax. Return raw JSON.`;

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' } });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text.trim());
      } catch (err) {
        console.warn(`[GEMINI SERVICE WARNING] Calling API failed (${err.message}). Activating fallback strategy...`);
      }
    }

    // High-fidelity fallback strategy mapping common growth goals
    const lowerGoal = goal.toLowerCase();
    if (lowerGoal.includes('repeat') || lowerGoal.includes('retention') || lowerGoal.includes('dormant') || lowerGoal.includes('miss')) {
      return {
        segment: 'Dormant Customers',
        reason: 'Customers who registered and haven\'t placed any orders in the last 60 days.',
        channel: 'WhatsApp',
        message: 'Hey {{name}}! We miss you. Use code RETURN20 to get 20% off your next purchase.',
        predictedReach: 120,
        predictedRevenue: 4800
      };
    } else if (lowerGoal.includes('vip') || lowerGoal.includes('high') || lowerGoal.includes('loyalty') || lowerGoal.includes('premium')) {
      return {
        segment: 'High Value VIPs',
        reason: 'Customers with Lifetime Value exceeding $500 or more than 5 completed orders.',
        channel: 'Email',
        message: 'Dear {{name}}, as one of our VIPs, we invite you to an exclusive early access sale. Enjoy 30% off site-wide!',
        predictedReach: 45,
        predictedRevenue: 13500
      };
    } else if (lowerGoal.includes('new') || lowerGoal.includes('welcome') || lowerGoal.includes('first')) {
      return {
        segment: 'New Registrations',
        reason: 'Recently registered accounts that have not completed their first transaction.',
        channel: 'SMS',
        message: 'Hi {{name}}! Welcome to Xeno. Start shopping today and get free delivery on your first order. Coupon: FIRSTFREE',
        predictedReach: 200,
        predictedRevenue: 3000
      };
    }

    // General default fallback
    return {
      segment: 'General Target Audience',
      reason: `Audience matched to campaign goal: "${goal}" based on purchase frequencies.`,
      channel: 'Email',
      message: 'Hello {{name}}! Check out our new season additions and trending collections today.',
      predictedReach: 350,
      predictedRevenue: 8500
    };
  }

  /**
   * Natural Language Audience Segmentation Parser
   * Converts user intents into MongoDB query filter objects
   */
  async generateMongoDBQuery(nlPrompt) {
    const prompt = `You are a Senior database developer.
Convert the following natural language request for a customer segment database filter into a valid MongoDB query object targeting our Customer and Order models:
NL Request: "${nlPrompt}"

Database Schemas:
Customer: {
  email: String,
  phone: String,
  engagementScore: Number (0-100),
  customerLifetimeValue: Number,
  segmentTags: [String],
  createdAt: Date
}

Return ONLY a raw JSON object representing the filter to be passed directly to Customer.find(filter).
Do not wrap it in markdown code blocks. Example output:
{"customerLifetimeValue": {"$gt": 100}}`;

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' } });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text.trim());
      } catch (err) {
        console.warn(`[GEMINI SERVICE WARNING] NL segment query conversion failed (${err.message}). Activating local parser...`);
      }
    }

    // Advanced Local NL Parser matching growth campaign intents
    const cleanPrompt = nlPrompt.toLowerCase();
    const query = {};

    // 1. CLV metrics matching
    if (cleanPrompt.includes('clv') || cleanPrompt.includes('lifetime value') || cleanPrompt.includes('spent')) {
      const match = cleanPrompt.match(/(\d+)/);
      const value = match ? parseInt(match[1], 10) : 100;
      if (cleanPrompt.includes('greater') || cleanPrompt.includes('more than') || cleanPrompt.includes('>') || cleanPrompt.includes('above')) {
        query.customerLifetimeValue = { $gt: value };
      } else if (cleanPrompt.includes('less') || cleanPrompt.includes('<') || cleanPrompt.includes('below')) {
        query.customerLifetimeValue = { $lt: value };
      } else {
        query.customerLifetimeValue = { $gte: value };
      }
    }

    // 2. Engagement score matching
    if (cleanPrompt.includes('engagement') || cleanPrompt.includes('score')) {
      const match = cleanPrompt.match(/(\d+)/);
      const value = match ? parseInt(match[1], 10) : 50;
      if (cleanPrompt.includes('high') || cleanPrompt.includes('greater') || cleanPrompt.includes('>')) {
        query.engagementScore = { $gte: value };
      } else {
        query.engagementScore = { $lt: value };
      }
    }

    // 3. Segment tags matching
    if (cleanPrompt.includes('tag') || cleanPrompt.includes('tagged')) {
      if (cleanPrompt.includes('vip')) {
        query.segmentTags = 'VIP';
      } else if (cleanPrompt.includes('churn')) {
        query.segmentTags = 'ChurnRisk';
      } else if (cleanPrompt.includes('dormant')) {
        query.segmentTags = 'Dormant';
      }
    }

    // 4. Default mock filters if prompt is too complex for simple regex
    if (Object.keys(query).length === 0) {
      // Return a general filter targeting low engagement/CLV for dormant users
      if (cleanPrompt.includes('dormant') || cleanPrompt.includes('inactive') || cleanPrompt.includes('not ordered')) {
        query.engagementScore = { $lt: 40 };
      } else if (cleanPrompt.includes('active') || cleanPrompt.includes('loyal')) {
        query.engagementScore = { $gte: 75 };
      } else {
        // Safe general query matching everything
        query.engagementScore = { $gte: 0 };
      }
    }

    return query;
  }

  /**
   * Explainable AI Segment Query Explainer
   * POST /api/v1/ai/explain-segment
   */
  async explainSegmentQuery(queryObject) {
    const prompt = `You are an Explainable AI engine.
Explain in 1 simple sentence what type of customers are selected by the following MongoDB filter query:
${JSON.stringify(queryObject)}
Return only the explanation sentence.`;

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } catch (err) {
        console.warn(`[GEMINI SERVICE WARNING] Query explanation API call failed (${err.message}). Generating fallback description...`);
      }
    }

    // Fallback explainable AI query decomposer
    const keys = Object.keys(queryObject);
    if (keys.length === 0) return 'All registered customers in the system.';

    const explanations = [];
    for (const key of keys) {
      const condition = queryObject[key];
      if (key === 'customerLifetimeValue') {
        if (condition.$gt) explanations.push(`have a Customer Lifetime Value greater than $${condition.$gt}`);
        else if (condition.$lt) explanations.push(`have a Customer Lifetime Value less than $${condition.$lt}`);
        else explanations.push(`have a Customer Lifetime Value of $${condition.$gte || condition}`);
      }
      if (key === 'engagementScore') {
        if (condition.$gte) explanations.push(`possess an engagement score of ${condition.$gte} or higher`);
        else if (condition.$lt) explanations.push(`have an engagement score below ${condition.$lt}`);
        else explanations.push(`possess an engagement score matching ${condition}`);
      }
      if (key === 'segmentTags') {
        explanations.push(`are tagged with "${condition}"`);
      }
    }

    if (explanations.length > 0) {
      return `Customers who ${explanations.join(' and ')}.`;
    }

    return 'Customers selected based on target transaction and interaction rules.';
  }

  /**
   * Campaign Performance Analytics AI Summary Generator
   */
  async generateCampaignInsights(metricsSummary) {
    const prompt = `Analyze these campaign communication results:
${JSON.stringify(metricsSummary, null, 2)}

Provide a JSON object containing:
{
  "summary": "1-sentence summary of campaign performance",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}
Only output raw JSON.`;

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' } });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text.trim());
      } catch (err) {
        console.warn(`[GEMINI SERVICE WARNING] Campaign performance summary failed (${err.message}). Activating analytics engine fallback...`);
      }
    }

    // Contextual heuristics insight engine
    const { sent, converted, channel } = metricsSummary;
    const rate = sent > 0 ? Math.round((converted / sent) * 100) : 0;

    let summary = `This campaign achieved a ${rate}% conversion rate using the ${channel} channel.`;
    const recommendations = [];

    if (rate >= 10) {
      summary = `The campaign performed exceptionally well with a high conversion rate of ${rate}% via ${channel}.`;
      recommendations.push(`Scale campaigns targeting this segment using ${channel} immediately.`);
      recommendations.push('Create a lookalike audience segment to expand reach.');
    } else if (rate >= 5) {
      summary = `The campaign achieved standard results with a ${rate}% conversion rate.`;
      recommendations.push(`Test increasing the discount percentage in ${channel} to stimulate conversions.`);
      recommendations.push('A/B test the content copy script to improve clicks.');
    } else {
      summary = `The campaign conversion was low at ${rate}%. Engagements were lower than anticipated.`;
      recommendations.push(`Consider switching from ${channel} to a more interactive channel like WhatsApp.`);
      recommendations.push('Refine the target segment filters to clean dormant accounts.');
    }

    return {
      summary,
      recommendations: recommendations.length > 0 ? recommendations : ['Optimize dispatch times.', 'Refine copy content.']
    };
  }

  /**
   * Explain Segment query rules in plain English (Phase 3 format)
   */
  async generateSegmentExplanation(queryObject) {
    return this.explainSegmentQuery(queryObject);
  }

  /**
   * Parse natural language prompt into Mongo filter query (Phase 3 format)
   */
  async parseNaturalLanguageSegment(nlPrompt) {
    return this.generateMongoDBQuery(nlPrompt);
  }
}

export const geminiService = new GeminiService();
export default geminiService;
