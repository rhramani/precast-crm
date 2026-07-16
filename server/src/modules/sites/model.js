const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Branch ID is required'],
    },
    siteName: {
      type: String,
      required: [true, 'Site name is required'],
      trim: true,
    },
    siteAddress: {
      type: String,
      trim: true,
      default: '',
    },
    siteEngineer: {
      type: String,
      trim: true,
      default: '',
    },
    contactNumber: {
      type: String,
      trim: true,
      default: '',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    siteArea: {
      type: Number,
      default: 0,
      min: [0, 'Site area cannot be negative'],
    },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'on_hold'],
      default: 'planned',
    },
    wallTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WallCategoryTemplate',
      default: null,
    },
    transportRatePerTrip: {
      type: Number,
      default: 0,
      min: [0, 'Transport rate cannot be negative'],
    },
    labourRatePerManDay: {
      type: Number,
      default: 0,
      min: [0, 'Labour rate cannot be negative'],
    },
    panelSellingPrice: { type: Number, default: 0 },
    poleSellingPrice: { type: Number, default: 0 },
    beamSellingPrice: { type: Number, default: 0 },
    topBeamSellingPrice: { type: Number, default: 0 },
    cementRate: { type: Number, default: 0 },
    steelRate: { type: Number, default: 0 },
    aggregateRate: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Site', siteSchema);
