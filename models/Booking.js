const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    groundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ground', required: true, index: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true, index: true },
    bookingCode: { type: String, trim: true, index: true },
    teamName: { type: String, required: true, trim: true },
    captainName: { type: String, trim: true },
    captainPhone: { type: String, trim: true },
    date: { type: String, required: true, index: true },
    dateValue: { type: Date, required: true, index: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['upi', 'cod', 'cash', 'netbanking'], default: 'upi' },
    bookingStatus: { type: String, enum: ['confirmed', 'cancelled', 'completed', 'pending'], default: 'confirmed' },
    paymentStatus: { type: String, enum: ['paid', 'pending', 'failed'], default: 'paid' },
    cancellationReason: { type: String, trim: true },
    notes: { type: String, trim: true },
    playerCount: { type: Number, min: 0 },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Booking', bookingSchema);