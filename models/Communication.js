import mongoose from 'mongoose';

const statusEventSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['sent', 'delivered', 'opened', 'clicked', 'converted', 'failed'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, { _id: false });

const communicationSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Communication log must reference a Campaign'],
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Communication log must reference a Customer'],
      index: true
    },
    channel: {
      type: String,
      enum: {
        values: ['Email', 'SMS', 'WhatsApp', 'RCS'],
        message: 'Channel must be: Email, SMS, WhatsApp, or RCS'
      },
      required: [true, 'Channel is required']
    },
    message: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'opened', 'clicked', 'converted', 'failed'],
      default: 'sent',
      index: true
    },
    events: {
      type: [statusEventSchema],
      default: function () {
        return [{ status: 'sent', timestamp: new Date() }];
      }
    }
  },
  {
    timestamps: true
  }
);

// Apply compound index for quick campaign performance tracking
communicationSchema.index({ campaignId: 1, status: 1 });

export const Communication = mongoose.model('Communication', communicationSchema);
export default Communication;
