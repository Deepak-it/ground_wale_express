const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

function normalizeRole(value) {
  const role = String(value || '')
    .trim()
    .toLowerCase();

  if (!role) {
    return undefined;
  }

  if (
    role === 'box_cricket_owner' ||
    role === 'box' ||
    role === 'box cricket' ||
    role === 'box_cricket' ||
    role === 'boxcricket' ||
    role === 'box-cricket'
  ) {
    return 'box_cricket_owner';
  }

  if (role === 'academy_owner' || role === 'academy' || role === 'coach') {
    return 'academy_owner';
  }

  if (
    role === 'ground_owner' ||
    role === 'owner' ||
    role === 'ground' ||
    role === 'turf' ||
    role === 'turf_owner'
  ) {
    return 'ground_owner';
  }

  if (
    role === 'player' ||
    role === 'captain' ||
    role === 'sportsneo' ||
    role === 'sports neo' ||
    role === 'sports_neo' ||
    role === 'sports-neo'
  ) {
    return 'player';
  }

  return role;
}

function normalizeSportsNeoRole(value) {
  const role = String(value || '')
    .trim()
    .toLowerCase();

  if (!role) {
    return undefined;
  }

  if (role === 'player' || role === 'captain') {
    return role;
  }

  return role;
}

function resolveRoleForProfileUpdate({ role, sportsNeoRole }) {
  const normalizedSportsNeoRole = normalizeSportsNeoRole(sportsNeoRole);
  if (normalizedSportsNeoRole === 'player' || normalizedSportsNeoRole === 'captain') {
    return 'player';
  }

  return normalizeRole(role);
}

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.ownerId);

  if (!user) {
    throw httpError(404, 'Owner not found');
  }

  res.json(user);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const hasField = (key) => Object.prototype.hasOwnProperty.call(req.body, key);

  const setPayload = {};
  if (hasField('ownerName')) {
    setPayload.ownerName = req.body.ownerName;
  }
  if (hasField('email')) {
    setPayload.email = req.body.email;
  }
  if (hasField('address')) {
    setPayload.address = req.body.address;
  }
  if (hasField('mapLocation')) {
    setPayload.mapLocation = req.body.mapLocation;
  }
  if (hasField('contactNumber')) {
    setPayload.contactNumber = req.body.contactNumber;
  }
  if (hasField('isCaptain')) {
    setPayload.isCaptain = req.body.isCaptain;
  }
  if (hasField('communicationSettings')) {
    setPayload.communicationSettings = req.body.communicationSettings;
  }
  if (hasField('paymentMethods')) {
    setPayload.paymentMethods = req.body.paymentMethods;
  }
  if (hasField('feePlans')) {
    setPayload.feePlans = req.body.feePlans;
  }

  const normalizedSportsNeoRole = hasField('sportsNeoRole')
    ? normalizeSportsNeoRole(req.body.sportsNeoRole)
    : undefined;
  if (normalizedSportsNeoRole !== undefined) {
    setPayload.sportsNeoRole = normalizedSportsNeoRole;
  }

  const resolvedRole = resolveRoleForProfileUpdate({
    role: hasField('role') ? req.body.role : undefined,
    sportsNeoRole: normalizedSportsNeoRole,
  });
  if (resolvedRole !== undefined) {
    setPayload.role = resolvedRole;
  }

  const user = await User.findByIdAndUpdate(
    req.params.ownerId,
    {
      $set: setPayload,
    },
    { new: true, runValidators: true },
  );

  if (!user) {
    throw httpError(404, 'Owner not found');
  }

  res.json(user);
});

exports.getNotificationPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.ownerId).select('notificationPreferences');

  if (!user) {
    throw httpError(404, 'Owner not found');
  }

  res.json(user.notificationPreferences);
});

exports.updateNotificationPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.ownerId);

  if (!user) {
    throw httpError(404, 'Owner not found');
  }

  user.notificationPreferences = {
    ...user.notificationPreferences?.toObject?.(),
    ...req.body,
  };

  await user.save();
  res.json(user.notificationPreferences);
});