const mongoose = require('mongoose');

const attendanceEntrySchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademyStudent', required: true },
    status: { type: String, enum: ['present', 'absent', 'leave'], required: true },
  },
  { _id: false },
);

const academyAttendanceSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    academyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', index: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademyBatch', required: true, index: true },
    date: { type: Date, required: true, index: true },
    entries: { type: [attendanceEntrySchema], default: [] },
  },
  { timestamps: true },
);

academyAttendanceSchema.index({ ownerId: 1, batchId: 1, date: 1 }, { unique: true });
academyAttendanceSchema.index({ ownerId: 1, academyId: 1, batchId: 1, date: 1 });

module.exports = mongoose.model('AcademyAttendance', academyAttendanceSchema);
