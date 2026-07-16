const mongoose = require('mongoose');

const productionOrderSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Branch ID is required'],
    },
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    plannedQuantity: {
      type: Number,
      required: [true, 'Planned quantity is required'],
      min: [1, 'Planned quantity must be at least 1'],
    },
    producedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Produced quantity cannot be negative'],
    },
    damagedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Damaged quantity cannot be negative'],
    },
    bomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BOM',
      required: [true, 'BOM ID is required'],
    },
    materialsConsumed: [
      {
        materialId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'RawMaterial',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'pending', 'in_production', 'completed', 'cancelled'],
      default: 'draft',
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

// Unique order number within a branch
productionOrderSchema.index({ branchId: 1, orderNumber: 1 }, { unique: true });

module.exports = mongoose.model('ProductionOrder', productionOrderSchema);
