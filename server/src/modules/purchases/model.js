const mongoose = require('mongoose');

const poItemSchema = new mongoose.Schema(
  {
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      required: [true, 'Material ID is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.0001, 'Quantity must be positive'],
    },
    purchaseRate: {
      type: Number,
      required: [true, 'Purchase rate is required'],
      min: [0, 'Purchase rate cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Branch ID is required'],
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier ID is required'],
    },
    poNumber: {
      type: String,
      required: [true, 'PO number is required'],
      trim: true,
    },
    items: [poItemSchema],
    subTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'ordered', 'received', 'cancelled'],
      default: 'draft',
    },
    expectedDeliveryDate: {
      type: Date,
      default: null,
    },
    receivedDate: {
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

// Unique PO number per branch
purchaseOrderSchema.index({ branchId: 1, poNumber: 1 }, { unique: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
