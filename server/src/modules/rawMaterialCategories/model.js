const mongoose = require('mongoose');

const rawMaterialCategorySchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Branch ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Prevent duplicate category names within the same branch
rawMaterialCategorySchema.index({ branchId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('RawMaterialCategory', rawMaterialCategorySchema);
