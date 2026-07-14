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
      wallPanels:       { type: Number, default: 0 },
      poles:            { type: Number, default: 0 },
      beams:            { type: Number, default: 0 },
      topBeams:         { type: Number, default: 0 },
      cement:           { type: Number, default: 0 }, // bags
      steel:            { type: Number, default: 0 },  // kg
      aggregate:        { type: Number, default: 0 },  // kg/tons
      labour:           { type: Number, default: 0 },  // man-days
      installationDays: { type: Number, default: 0 },
      transportTrips:   { type: Number, default: 0 },
      estimatedCost:    { type: Number, default: 0 },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('SiteRequirementCalculation', siteRequirementCalculationsSchema);
