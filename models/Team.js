const mongoose = require('mongoose');

const teamPlayerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    contactNumber: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    playerType: { type: String, trim: true, default: '' },
    isGuest: { type: Boolean, default: false },
  },
  {
    _id: true,
  },
);

const teamSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    players: { type: [teamPlayerSchema], default: () => [] },
  },
  {
    timestamps: true,
  },
);

teamSchema.index({ ownerId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);