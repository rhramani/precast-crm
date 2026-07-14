const mongoose = require('mongoose');

const bomItemSchema = new mongoose.Schema(
  {
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      required: [true, 'Raw material ID is required'],
    },
    quantityRequired: {
      type: Number,
      required: [true, 'Quantity required is required'],
      min: [0.0001, 'Quantity required must be greater than zero'],
    },
    unit: {
      type: String,
      required: [true, 'Unit of measure is required'],
      trim: true,
    },
    wastagePercent: {
      type: Number,
      default: 0,
      min: [0, 'Wastage percentage cannot be negative'],
    },
  },
  { _id: false }
);

const bomSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Branch ID is required'],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    version: {
      type: Number,
      required: [true, 'BOM version is required'],
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    items: [bomItemSchema],
    calculatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user ID is required'],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index: version uniqueness per product
bomSchema.index({ productId: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('BOM', bomSchema);
