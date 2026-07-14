const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Branch ID is required'],
    },
    materialCode: {
      type: String,
      required: [true, 'Material code is required'],
      trim: true,
    },
    materialName: {
      type: String,
      required: [true, 'Material name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['cement', 'sand', 'aggregate', 'steel', 'chemical', 'fly_ash', 'stone_dust', 'water', 'other'],
      required: [true, 'Category is required'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
    },
    currentQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Quantity cannot be negative'],
    },
    minimumQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Minimum quantity cannot be negative'],
    },
    purchaseRate: {
      type: Number,
      default: 0,
      min: [0, 'Purchase rate cannot be negative'],
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
  },
  { timestamps: true }
);

// Compounding unique index on branchId + materialCode to prevent duplicate codes inside a branch
rawMaterialSchema.index({ branchId: 1, materialCode: 1 }, { unique: true });

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
