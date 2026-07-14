const mongoose = require('mongoose');

const materialLedgerSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Branch ID is required'],
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      required: [true, 'Material ID is required'],
    },
    type: {
      type: String,
      enum: ['in', 'out', 'transfer', 'adjustment'],
      required: [true, 'Transaction type is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.0001, 'Quantity must be greater than zero'],
    },
    referenceType: {
      type: String,
      enum: ['purchase', 'production', 'transfer', 'manual'],
      required: [true, 'Reference type is required'],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // Points to purchase order, production order, or transfer transaction
    },
    balanceAfter: {
      type: Number,
      required: [true, 'Balance after is required'],
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user ID is required'],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // Ledger is append-only, no updates
);

module.exports = mongoose.model('MaterialLedger', materialLedgerSchema);
