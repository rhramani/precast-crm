const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Branch ID is required'],
    },
    productCode: {
      type: String,
      required: [true, 'Product code is required'],
      trim: true,
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductCategory',
      required: [true, 'Category is required'],
    },
    dimensions: {
      width:     { type: String, default: '' },
      height:    { type: String, default: '' },
      length:    { type: String, default: '' },
      thickness: { type: String, default: '' },
    },
    weight: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      required: [true, 'Unit of measure is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    makingCharge: {
      type: Number,
      default: 0,
      min: [0, 'Making charge cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      default: 0,
      min: [0, 'Selling price cannot be negative'],
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate product codes inside a single branch
productSchema.index({ branchId: 1, productCode: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
