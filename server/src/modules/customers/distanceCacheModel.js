const mongoose = require('mongoose');

const distanceCacheSchema = new mongoose.Schema(
  {
    origin: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    distanceKm: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Compound unique index to quickly look up cache entries for a specific origin/destination pair
distanceCacheSchema.index({ origin: 1, destination: 1 }, { unique: true });

module.exports = mongoose.model('DistanceCache', distanceCacheSchema);
