const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: ['booking', 'payment', 'system', 'support'], default: 'system' },
    isRead: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Notification', notificationSchema);