const mongoose = require('mongoose');

const academyFeeSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    academyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademyStudent', required: true, index: true },
    monthKey: { type: String, required: true, trim: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['paid', 'pending', 'partial'], default: 'pending', index: true },
    paymentMode: { type: String, trim: true },
    planDuration: { type: String, trim: true, default: 'Monthly' },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date, index: true },
    reminderSentAt: { type: Date },
  },
  { timestamps: true },
);

academyFeeSchema.index({ ownerId: 1, studentId: 1, monthKey: 1 }, { unique: true });
academyFeeSchema.index({ ownerId: 1, academyId: 1, monthKey: 1 });

module.exports = mongoose.model('AcademyFee', academyFeeSchema);
