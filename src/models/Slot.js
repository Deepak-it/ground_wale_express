const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    groundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ground', required: true, index: true },
    date: { type: Date, required: true },
    day: { type: String, trim: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['available', 'booked', 'blocked'], default: 'available', index: true },
    bookedByTeam: { type: String, trim: true },
    blockedReason: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Slot', slotSchema);