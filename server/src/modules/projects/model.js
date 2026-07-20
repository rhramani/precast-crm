const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
    },
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'on_hold'],
      default: 'planned',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
