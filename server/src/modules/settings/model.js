const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    logo: {
      type: String, // Base64 data URI string
      default: '',
    },
    favicon: {
      type: String, // Base64 data URI string for tab icon
      default: '',
    },
    companyName: {
      type: String,
      default: 'GIR Precast',
      trim: true,
    },
    fontFamily: {
      type: String,
      default: 'Inter',
      enum: ['Inter', 'Roboto', 'Public Sans'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
