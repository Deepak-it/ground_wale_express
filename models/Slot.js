const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    groundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ground', required: true, index: true },
    // Range-based slot (one record covers dateFrom → dateTo)
    dateFrom: { type: Date, index: true },
    dateTo:   { type: Date, index: true },
    // Legacy single-date slot (kept for backward compat)
    date: { type: Date, index: true },
    day: { type: String, trim: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['available', 'booked', 'blocked'], default: 'available', index: true },
    bookedByTeam: { type: String, trim: true },
    bookedDates: [{ type: Date }],
    blockedDates: [{ type: String }],
    blockedReason: { type: String, trim: true },
    deletedDates: [{ type: String }],
    priceOverrides: { type: Map, of: Number, default: {} },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Slot', slotSchema);