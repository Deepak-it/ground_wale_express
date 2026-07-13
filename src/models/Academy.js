const mongoose = require('mongoose');

const academyFeePlanSchema = new mongoose.Schema(
  {
    duration: { type: String, trim: true },
    price: { type: String, trim: true },
  },
  { _id: false },
);

const academyBatchSchema = new mongoose.Schema(
  {
    batchName: { type: String, trim: true },
    coachName: { type: String, trim: true },
    coachNumber: { type: String, trim: true },
    perBatchStudents: { type: String, trim: true },
    category: { type: String, trim: true },
    recurringDays: { type: [String], default: [] },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    feePlans: { type: [academyFeePlanSchema], default: [] },
  },
  { _id: false },
);

const academySchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    // Extended registration fields
    address: { type: String, trim: true },
    areaLocation: { type: String, trim: true },
    landmark: { type: String, trim: true },
    state: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    facilities: { type: [String], default: [] },
    groundImages: { type: [String], default: [] },
    ownershipProof: { type: String, trim: true },
    batch: { type: academyBatchSchema, default: undefined },
    sports: { type: [String], default: [] },
    reviewStatus: {
      type: String,
      enum: ['draft', 'under_review', 'approved', 'rejected'],
      default: 'draft',
      index: true,
    },
    submittedAt: { type: Date },
  },
  { timestamps: true },
);

academySchema.index({ ownerId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Academy', academySchema);
