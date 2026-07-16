const mongoose = require('mongoose');

// Each product line in the template
const templateProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    qtyPerBay: {
      type: Number,
      required: [true, 'Quantity per bay is required'],
      min: [0.001, 'Quantity per bay must be greater than zero'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
      default: 'pcs',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

// Each installation raw material line in the template
const templateMaterialSchema = new mongoose.Schema(
  {
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      required: [true, 'Material ID is required'],
    },
    qty: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity must be positive'],
    },
    type: {
      type: String,
      enum: ['per_pole', 'per_meter'],
      required: [true, 'Allocation type is required'],
      default: 'per_pole',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const wallCategoryTemplateSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Branch ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
    },
    // Dynamic — matches product category values from Product Master (no fixed enum)
    category: {
      type: String,
      required: [true, 'Wall category is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    // How many meters of wall = 1 "bay" (structural unit)
    baySpacingMeters: {
      type: Number,
      default: 3,
      min: [0.1, 'Bay spacing must be at least 0.1 meter'],
    },
    // List of products required per bay
    products: {
      type: [templateProductSchema],
      default: [],
    },
    installationMaterials: {
      type: [templateMaterialSchema],
      default: [],
    },
    // Mark one template per category as the default
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Unique template name per branch
wallCategoryTemplateSchema.index({ branchId: 1, name: 1 }, { unique: true });
// Index for quick default lookup per branch+category
wallCategoryTemplateSchema.index({ branchId: 1, category: 1, isDefault: 1 });

module.exports = mongoose.model('WallCategoryTemplate', wallCategoryTemplateSchema);

