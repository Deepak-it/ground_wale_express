const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    groundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ground', required: true, index: true },
    type: { type: String, enum: ['credit', 'withdrawal', 'adjustment'], required: true },
    amount: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    status: { type: String, enum: ['success', 'pending', 'failed'], default: 'success' },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);