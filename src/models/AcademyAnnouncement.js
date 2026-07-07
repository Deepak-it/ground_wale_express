const mongoose = require('mongoose');

const studentDeliverySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    time: { type: String, trim: true },
  },
  { _id: false },
);

const academyAnnouncementSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ['fees', 'schedule', 'holiday', 'general'],
      default: 'general',
      index: true,
    },
    audience: {
      type: String,
      enum: ['all', 'morning', 'evening', 'batch'],
      default: 'all',
      index: true,
    },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademyBatch', index: true },
    status: {
      type: String,
      enum: ['sent', 'scheduled'],
      default: 'sent',
      index: true,
    },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    attachmentName: { type: String, trim: true },
    attachmentSize: { type: String, trim: true },
    seenStudents: { type: [studentDeliverySchema], default: [] },
    notSeenStudents: { type: [studentDeliverySchema], default: [] },
  },
  { timestamps: true },
);

academyAnnouncementSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('AcademyAnnouncement', academyAnnouncementSchema);
