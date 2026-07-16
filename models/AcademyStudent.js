const mongoose = require('mongoose');

const academyStudentSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    academyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', index: true },
    fullName: { type: String, required: true, trim: true, index: true },
    phone: { type: String, trim: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademyBatch', index: true },
    batchName: { type: String, trim: true },
    joinDate: { type: Date, default: Date.now },
    monthlyFee: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    photoBase64: { type: String, default: '' },
  },
  { timestamps: true },
);

academyStudentSchema.index({ ownerId: 1, fullName: 1 });
academyStudentSchema.index({ ownerId: 1, academyId: 1, fullName: 1 });

module.exports = mongoose.model('AcademyStudent', academyStudentSchema);
