const mongoose = require('mongoose');

const academyBatchSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    coachName: { type: String, trim: true },
    startTime: { type: String, trim: true, default: '06:00' },
    endTime: { type: String, trim: true, default: '07:00' },
    days: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
    capacity: { type: Number, default: 30, min: 1 },
    monthlyFee: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  },
  { timestamps: true },
);

academyBatchSchema.index({ ownerId: 1, name: 1 });

module.exports = mongoose.model('AcademyBatch', academyBatchSchema);
