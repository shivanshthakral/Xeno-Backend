import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    goal: {
      type: String,
      required: [true, 'Campaign goal description is required'],
      trim: true
    },
    customGoal: {
      type: String,
      trim: true
    },
    segmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Segment',
      required: [true, 'Campaign must target a valid Segment'],
      index: true
    },
    channel: {
      type: String,
      enum: {
        values: ['Email', 'SMS', 'WhatsApp', 'RCS'],
        message: 'Channel must be: Email, SMS, WhatsApp, or RCS'
      },
      required: [true, 'Communication channel is required']
    },
    generatedMessage: {
      type: String,
      required: [true, 'Campaign message content is required'],
      trim: true
    },
    predictedReach: {
      type: Number,
      default: 0,
      min: [0, 'Predicted reach cannot be negative']
    },
    predictedRevenue: {
      type: Number,
      default: 0,
      min: [0, 'Predicted revenue cannot be negative']
    },
    aiMetadata: {
      audienceReason: { type: String, trim: true },
      channelReason: { type: String, trim: true },
      confidenceScore: { type: Number, min: 0, max: 100 }
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'active', 'completed'],
        message: 'Status must be: draft, active, or completed'
      },
      default: 'draft',
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Campaign = mongoose.model('Campaign', campaignSchema);
export default Campaign;
