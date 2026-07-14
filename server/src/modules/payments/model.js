const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Branch ID is required'],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
    },
    paymentNumber: {
      type: String,
      required: [true, 'Payment voucher number is required'],
      trim: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be positive'],
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque', 'other'],
      default: 'bank_transfer',
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
    },
  },
  { timestamps: true }
);

// Unique payment voucher per branch
paymentSchema.index({ branchId: 1, paymentNumber: 1 }, { unique: true });

module.exports = mongoose.model('Payment', paymentSchema);
