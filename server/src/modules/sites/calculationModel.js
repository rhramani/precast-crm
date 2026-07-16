const mongoose = require('mongoose');

const siteRequirementCalculationsSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: [true, 'Site ID is required'],
    },
    siteArea: {
      type: Number,
      required: [true, 'Site area is required'],
      min: 0,
    },
    calculated: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('SiteRequirementCalculation', siteRequirementCalculationsSchema);
