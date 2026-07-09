const mongoose = require('mongoose');

const academySchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  },
  { timestamps: true },
);

academySchema.index({ ownerId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Academy', academySchema);
