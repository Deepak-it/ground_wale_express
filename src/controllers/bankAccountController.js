const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.getBankAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.ownerId).select('bankAccount ownerName contactNumber');

  if (!user) {
    throw httpError(404, 'Owner not found');
  }

  res.json(user);
});

exports.upsertBankAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.ownerId);

  if (!user) {
    throw httpError(404, 'Owner not found');
  }

  user.bankAccount = {
    ...user.bankAccount?.toObject?.(),
    ...req.body,
  };

  await user.save();
  res.json(user.bankAccount);
});