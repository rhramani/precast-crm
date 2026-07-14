const mongoose = require('mongoose');

const dispatchItemSchema = new mongoose.Schema(
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

const transportDetailsSchema = new mongoose.Schema(
  {
    vehicleNumber: { type: String, trim: true, default: '' },
    driverName:    { type: String, trim: true, default: '' },
    contactNumber: { type: String, trim: true, default: '' },
    helperName:    { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const dispatchSchema = new mongoose.Schema(
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
    dispatchNumber: {
      type: String,
      required: [true, 'Dispatch number is required'],
      trim: true,
    },
    items: [dispatchItemSchema],
    transportDetails: {
      type: transportDetailsSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['draft', 'dispatched', 'delivered'],
      default: 'draft',
    },
    dispatchedDate: {
      type: Date,
      default: null,
    },
    deliveredDate: {
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

// Unique dispatchNumber per branch
dispatchSchema.index({ branchId: 1, dispatchNumber: 1 }, { unique: true });

module.exports = mongoose.model('Dispatch', dispatchSchema);
