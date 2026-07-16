const mongoose = require('mongoose');

const labourAttendanceSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Branch ID is required'],
    },
    labourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Labour',
      required: [true, 'Labour reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'half_day'],
      default: 'present',
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Unique attendance entry per labourer per date
labourAttendanceSchema.index({ labourId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('LabourAttendance', labourAttendanceSchema);
