const mongoose = require('mongoose');

const daySlotSchema = new mongoose.Schema(
  {
    day: { type: String, required: true, trim: true },
    isEnabled: { type: Boolean, default: true },
    slotsPerDay: { type: Number, default: 3, min: 0 },
    startTime: { type: String, default: '06:00 AM', trim: true },
  },
  { _id: false },
);

const pricingItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const groundSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    groundName: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    areaLocation: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    landmark: { type: String, trim: true },
    description: { type: String, trim: true },
    state: { type: String, default: 'Punjab', trim: true },
    city: { type: String, default: 'Mohali', trim: true },
    sports: { type: [String], default: [] },
    offerType: {
      type: String,
      enum: ['cricketGround', 'academyCoaching', 'boxCricket', 'sportsNeo'],
    },
    entityType: {
      type: String,
      enum: ['ground', 'academy', 'box_cricket', 'sports_neo'],
      default: 'ground',
      index: true,
    },
    academyBatch: {
      batchName: { type: String, trim: true },
      coachName: { type: String, trim: true },
      perBatchStudents: { type: String, trim: true },
      category: { type: String, trim: true },
      recurringDays: { type: [String], default: [] },
      startTime: { type: String, trim: true },
      endTime: { type: String, trim: true },
      feePlans: {
        type: [
          new mongoose.Schema(
            {
              duration: { type: String, trim: true },
              price: { type: String, trim: true },
            },
            { _id: false },
          ),
        ],
        default: [],
      },
    },
    pitchType: { type: String, enum: ['cement', 'turf', 'matting', 'astroTurf'], default: 'cement' },
    facilities: { type: [String], default: ['Parking'] },
    groundImages: { type: [String], default: [] },
    ownershipProof: { type: String, trim: true },
    openingTime: { type: String, default: '06:00 AM', trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    slotSize: { type: String, default: '3 hours', trim: true },
    gap: { type: String, default: '30 Minutes', trim: true },
    matchType: { type: String, default: 'T20', trim: true },
    daySlots: { type: [daySlotSchema], default: [] },
    pricing: { type: [pricingItemSchema], default: [] },
    reviewStatus: {
      type: String,
      enum: ['draft', 'under_review', 'approved', 'rejected'],
      default: 'draft',
      index: true,
    },
    reviewNotes: { type: String, trim: true },
    submittedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Ground', groundSchema);