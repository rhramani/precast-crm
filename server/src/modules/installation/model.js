const mongoose = require('mongoose');

const installationItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
  },
  { _id: false }
);

const installationSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Branch ID is required'],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: [true, 'Site ID is required'],
    },
    installNumber: {
      type: String,
      required: [true, 'Installation sequence number is required'],
      trim: true,
    },
    itemsInstalled: [installationItemSchema],
    teamSize: {
      type: Number,
      default: 0,
      min: 0,
    },
    labourCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed'],
      default: 'planned',
    },
    startDate: {
      type: Date,
      default: null,
    },
    completedDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
    },
  },
  { timestamps: true }
);

// Unique installNumber per branch
installationSchema.index({ branchId: 1, installNumber: 1 }, { unique: true });

module.exports = mongoose.model('Installation', installationSchema);
