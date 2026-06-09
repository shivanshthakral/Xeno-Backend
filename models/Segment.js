import mongoose from 'mongoose';

const segmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Segment name is required'],
      unique: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    query: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Segment query filter definition is required']
    },
    customerCount: {
      type: Number,
      default: 0,
      min: [0, 'Customer count cannot be negative']
    },
    generatedByAI: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: false
    }
  },
  {
    timestamps: true
  }
);

export const Segment = mongoose.model('Segment', segmentSchema);
export default Segment;
