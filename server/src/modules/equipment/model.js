const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Branch ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Equipment name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['crane', 'jcb', 'vehicle', 'other'],
      required: [true, 'Equipment type is required'],
    },
    ratePerDay: {
      type: Number,
      default: 0,
      min: [0, 'Daily rate cannot be negative'],
    },
    status: {
      type: String,
      enum: ['available', 'allocated', 'maintenance'],
      default: 'available',
    },
    allocatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate equipment names inside a single branch
equipmentSchema.index({ branchId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Equipment', equipmentSchema);
