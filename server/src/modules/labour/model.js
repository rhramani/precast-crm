const mongoose = require('mongoose');

const labourSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Branch ID is required'],
    },
    labourName: {
      type: String,
      required: [true, 'Labour name is required'],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },
    labourType: {
      type: String,
      enum: ['mason', 'bar_bender', 'carpenter', 'helper', 'operator', 'supervisor'],
      default: 'helper',
    },
    dailyWages: {
      type: Number,
      required: [true, 'Daily wages rate is required'],
      min: [0, 'Daily wages cannot be negative'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Labour', labourSchema);
