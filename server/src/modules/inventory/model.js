const mongoose = require('mongoose');

const finishedGoodsInventorySchema = new mongoose.Schema(
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
    availableStock: {
      type: Number,
      default: 0,
      min: [0, 'Available stock cannot be negative'],
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock cannot be negative'],
    },
    damagedStock: {
      type: Number,
      default: 0,
      min: [0, 'Damaged stock cannot be negative'],
    },
    dispatchReadyStock: {
      type: Number,
      default: 0,
      min: [0, 'Dispatch ready stock cannot be negative'],
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

// Compound index to ensure single inventory record per product per branch
finishedGoodsInventorySchema.index({ branchId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('FinishedGoodsInventory', finishedGoodsInventorySchema);
