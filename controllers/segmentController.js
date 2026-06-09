import { Segment } from '../models/Segment.js';
import { Customer } from '../models/Customer.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { geminiService } from '../services/geminiService.js';

/**
 * Create a new Segment manually
 * POST /api/v1/segments
 */
export const createSegment = async (req, res, next) => {
  try {
    const { name, description, query } = req.body;

    if (!query) {
      throw new BadRequestError('Segment query filter is required.');
    }

    // Safety validation of query
    let mongoQuery = query;
    if (typeof query === 'string') {
      try {
        mongoQuery = JSON.parse(query);
      } catch (err) {
        throw new BadRequestError('Invalid JSON format for segment query.');
      }
    }

    // Run dynamic customer matching count
    let count = 0;
    try {
      count = await Customer.countDocuments(mongoQuery);
    } catch (dbErr) {
      throw new BadRequestError(`Invalid MongoDB query syntax: ${dbErr.message}`);
    }

    const newSegment = await Segment.create({
      name,
      description,
      query: mongoQuery,
      customerCount: count,
      generatedByAI: false,
      createdBy: req.user ? req.user._id : null
    });

    return sendSuccess(res, newSegment, 'Segment created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Segments
 * GET /api/v1/segments
 */
export const getAllSegments = async (req, res, next) => {
  try {
    const segments = await Segment.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
    return sendSuccess(res, segments, 'Segments retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Get Segment Details by ID
 * GET /api/v1/segments/:id
 */
export const getSegmentById = async (req, res, next) => {
  try {
    const segment = await Segment.findById(req.params.id).populate('createdBy', 'name email');
    if (!segment) {
      throw new NotFoundError('Segment not found.');
    }
    return sendSuccess(res, segment, 'Segment details retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing Segment
 * PUT /api/v1/segments/:id
 */
export const updateSegment = async (req, res, next) => {
  try {
    const { name, description, query } = req.body;

    const segment = await Segment.findById(req.params.id);
    if (!segment) {
      throw new NotFoundError('Segment not found.');
    }

    if (name) segment.name = name;
    if (description) segment.description = description;

    if (query) {
      let mongoQuery = query;
      if (typeof query === 'string') {
        try {
          mongoQuery = JSON.parse(query);
        } catch (err) {
          throw new BadRequestError('Invalid JSON format for segment query.');
        }
      }
      
      // Re-calculate customerCount dynamically
      try {
        segment.customerCount = await Customer.countDocuments(mongoQuery);
      } catch (dbErr) {
        throw new BadRequestError(`Invalid MongoDB query syntax: ${dbErr.message}`);
      }
      segment.query = mongoQuery;
    }

    const updatedSegment = await segment.save();
    return sendSuccess(res, updatedSegment, 'Segment updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a Segment
 * DELETE /api/v1/segments/:id
 */
export const deleteSegment = async (req, res, next) => {
  try {
    const segment = await Segment.findByIdAndDelete(req.params.id);
    if (!segment) {
      throw new NotFoundError('Segment not found.');
    }
    return sendSuccess(res, null, 'Segment deleted successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Generate a Segment via Natural Language input
 * POST /api/v1/segments/generate
 */
export const generateSegmentNL = async (req, res, next) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      throw new BadRequestError('Natural language segment prompt is required.');
    }

    // 1. Ask Gemini to translate prompt to Mongo filter
    const query = await geminiService.generateMongoDBQuery(prompt);

    // 2. Fetch matched customers count and previews
    const totalCount = await Customer.countDocuments(query);
    const sampleCustomers = await Customer.find(query).limit(5).select('name email customerLifetimeValue engagementScore');

    // 3. Aggregate statistics
    const statsResult = await Customer.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          avgClv: { $avg: '$customerLifetimeValue' },
          avgEngagement: { $avg: '$engagementScore' }
        }
      }
    ]);

    const stats = {
      totalCount,
      averageCLV: statsResult.length > 0 ? Math.round(statsResult[0].avgClv) : 0,
      averageEngagement: statsResult.length > 0 ? Math.round(statsResult[0].avgEngagement) : 0
    };

    // 4. Save the generated segment in database
    const segmentName = `AI Segment: ${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}`;
    
    // Auto delete existing segments with same name to avoid duplicates
    await Segment.deleteOne({ name: segmentName });

    const newSegment = await Segment.create({
      name: segmentName,
      description: `Auto-generated from prompt: "${prompt}"`,
      query,
      customerCount: totalCount,
      generatedByAI: true,
      createdBy: req.user ? req.user._id : null
    });

    return sendSuccess(res, {
      query,
      customerCount: totalCount,
      sampleCustomers
    }, 'Segment generated successfully via natural language.');
  } catch (error) {
    next(error);
  }
};
