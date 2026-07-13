const mongoose = require('mongoose');

const feePlanSchema = new mongoose.Schema(
  {
    duration: { type: String, trim: true },
    price: { type: String, trim: true },
  },
  { _id: false },
);

const academyBatchSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    academyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', index: true },
    name: { type: String, required: true, trim: true },
    coachName: { type: String, trim: true },
    coachExperience: { type: Number, default: 0, min: 0 },
    startTime: { type: String, trim: true, default: '06:00' },
    endTime: { type: String, trim: true, default: '07:00' },
    days: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
    capacity: { type: Number, default: 30, min: 1 },
    monthlyFee: { type: Number, default: 0, min: 0 },
    feePlans: { type: [feePlanSchema], default: [] },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  },
  { timestamps: true },
);

academyBatchSchema.index({ ownerId: 1, name: 1 });
academyBatchSchema.index({ ownerId: 1, academyId: 1, name: 1 });

module.exports = mongoose.model('AcademyBatch', academyBatchSchema);
