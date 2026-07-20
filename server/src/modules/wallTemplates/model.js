const mongoose = require('mongoose');

// Each product line in the template
const templateProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    qtyPerSqft: {
      type: Number,
      required: [true, 'Quantity per SQFT is required'],
      min: [0.0001, 'Quantity per SQFT must be greater than zero'],
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
      enum: ['per_pole', 'per_sqft', 'per_meter'],
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
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    productSqft: {
      type: Number,
      default: 0,
    },
    // Dynamic — matches product category values from Product Master (no fixed enum)
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductCategory',
      required: [true, 'Wall category is required'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    // Height of the wall in feet
    heightFeet: {
      type: Number,
      default: 6,
      min: [0.1, 'Wall height must be at least 0.1 feet'],
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

