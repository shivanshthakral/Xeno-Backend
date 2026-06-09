import { Customer } from '../models/Customer.js';
import { geminiService } from './geminiService.js';

class SegmentationService {
  /**
   * Convert natural language to MongoDB query filter, execute it, and return statistics + previews.
   * @param {string} prompt - Natural language segmentation request
   */
  async parseSegment(prompt) {
    // 1. Convert prompt to MongoDB query filter using Gemini service
    const query = await geminiService.parseNaturalLanguageSegment(prompt);

    // 2. Count matching customers in MongoDB
    const customerCount = await Customer.countDocuments(query);

    // 3. Fetch preview of sample customers matching query
    const sampleCustomers = await Customer.find(query)
      .limit(5)
      .select('name email customerLifetimeValue engagementScore');

    return {
      query,
      customerCount,
      sampleCustomers
    };
  }
}

export const segmentationService = new SegmentationService();
export default segmentationService;
