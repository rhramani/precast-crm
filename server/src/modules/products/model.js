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
      type: String,
      enum: [
        'cement_wall',
        'compound_wall',
        'boundary_wall',
        'pole',
        'beam',
        'top_beam',
        'slab',
        'paver_block',
        'column',
        'custom',
      ],
      required: [true, 'Category is required'],
    },
    dimensions: {
      width:     { type: Number, default: 0, min: 0 },
      height:    { type: Number, default: 0, min: 0 },
      length:    { type: Number, default: 0, min: 0 },
      thickness: { type: Number, default: 0, min: 0 },
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
