import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      select: false,
      minlength: [6, 'Password must be at least 6 characters long']
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    phone: {
      type: String,
      trim: true
    },
    engagementScore: {
      type: Number,
      default: 0,
      min: [0, 'Engagement score cannot be negative'],
      max: [100, 'Engagement score cannot exceed 100']
    },
    customerLifetimeValue: {
      type: Number,
      default: 0,
      min: [0, 'Customer Lifetime Value cannot be negative']
    },
    segmentTags: {
      type: [String],
      default: []
    },
    lastCampaignOpened: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null
    },
    lastCampaignClicked: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Hash password hook before saving
customerSchema.pre('save', async function (next) {
  // Only hash password if it was modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Generate salt and hash the password
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password match during login
customerSchema.methods.comparePassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

export const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
