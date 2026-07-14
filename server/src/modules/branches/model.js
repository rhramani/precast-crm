const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const branchSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
    },
    branchCode: {
      type: String,
      required: [true, 'Branch code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    mobileNumber: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required for branch login'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      default: 'branch',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    // Subscription fields
    subscription: {
      plan: {
        type: String,
        enum: ['trial', 'basic', 'professional', 'enterprise'],
        default: 'trial',
      },
      status: {
        type: String,
        enum: ['active', 'expired', 'suspended'],
        default: 'active',
      },
      startDate: { type: Date, default: null },
      expiryDate: { type: Date, default: null },
      maxUsers: { type: Number, default: 5 },
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    resetPasswordOtp: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before save
branchSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

// Compare password
branchSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Safe object representation
branchSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model('Branch', branchSchema);
