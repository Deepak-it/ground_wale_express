const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    groundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ground' },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);