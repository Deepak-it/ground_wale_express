const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { encryptImageString, decryptImageString } = require('../utils/imageCrypto');

function normalizeRole(value) {
  const role = String(value || '')
    .trim()
    .toLowerCase();

  if (!role) {
    return undefined;
  }

  if (role === 'owner') {
    return 'owner';
  }

  if (role === 'player') {
    return 'player';
  }

  return null;
}

function normalizeSportsNeoRole(value) {
  const role = String(value || '')
    .trim()
    .toLowerCase();

  if (!role) {
    return undefined;
  }

  if (role === 'player' || role === 'owner') {
    return role;
  }

  return null;
}

function resolveRoleForProfileUpdate({ role, sportsNeoRole }) {
  const normalizedSportsNeoRole = normalizeSportsNeoRole(sportsNeoRole);
  if (normalizedSportsNeoRole === 'player' || normalizedSportsNeoRole === 'owner') {
    return normalizedSportsNeoRole;
  }

  return normalizeRole(role);
}

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.ownerId).lean();

  if (!user) {
    throw httpError(404, 'Owner not found');
  }

  res.json({
    ...user,
    profileImage: decryptImageString(user.profileImage),
  });
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
  if (hasField('profileImage')) {
    setPayload.profileImage = encryptImageString(req.body.profileImage);
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
  if (hasField('sportsNeoRole') && normalizedSportsNeoRole === null) {
    throw httpError(400, 'sportsNeoRole must be either player or owner');
  }
  if (normalizedSportsNeoRole !== undefined) {
    setPayload.sportsNeoRole = normalizedSportsNeoRole;
  }

  if (hasField('role')) {
    const normalizedRole = normalizeRole(req.body.role);
    if (normalizedRole === null) {
      throw httpError(400, 'role must be either player or owner');
    }
  }

  const resolvedRole = resolveRoleForProfileUpdate({
    role: hasField('role') ? req.body.role : undefined,
    sportsNeoRole: normalizedSportsNeoRole,
  });
  if (resolvedRole !== undefined && resolvedRole !== null) {
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

  const payload = user.toObject ? user.toObject() : user;
  res.json({
    ...payload,
    profileImage: decryptImageString(payload.profileImage),
  });
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