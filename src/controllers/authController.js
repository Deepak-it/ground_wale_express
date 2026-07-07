const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function otpResponse(user, otpCode, otpExpiresAt) {
  return {
    message: 'OTP generated',
    userId: user.id,
    otp: otpCode,
    expiresAt: otpExpiresAt,
  };
}

function normalizeRole(value) {
  const role = String(value || '')
    .trim()
    .toLowerCase();

  if (!role) {
    return '';
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

exports.sendLoginOtp = asyncHandler(async (req, res) => {
  const { contactNumber } = req.body;

  if (!contactNumber) {
    throw httpError(400, 'contactNumber is required');
  }

  const user = await User.findOne({ contactNumber });

  if (!user) {
    throw httpError(404, 'User not registered. Please register first.');
  }

  const otpCode = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  user.otpCode = otpCode;
  user.otpExpiresAt = otpExpiresAt;
  user.otpVerified = false;
  await user.save();

  res.status(200).json(otpResponse(user, otpCode, otpExpiresAt));
});

exports.sendRegisterOtp = asyncHandler(async (req, res) => {
  const { ownerName = 'Ground Owner', contactNumber, email, role } = req.body;

  if (!contactNumber) {
    throw httpError(400, 'contactNumber is required');
  }

  const otpCode = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const updatePayload = {
    ownerName,
    email,
    otpCode,
    otpExpiresAt,
    otpVerified: false,
  };

  if (typeof role === 'string' && role.trim()) {
    updatePayload.role = normalizeRole(role);
  }

  const user = await User.findOneAndUpdate(
    { contactNumber },
    {
      $set: updatePayload,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  res.status(200).json(otpResponse(user, otpCode, otpExpiresAt));
});

// Backward-compatible alias. Existing clients hitting /send-otp will now follow login-safe behavior.
exports.sendOtp = exports.sendLoginOtp;

exports.verifyOtp = asyncHandler(async (req, res) => {
  const { contactNumber, otp } = req.body;

  if (!contactNumber || !otp) {
    throw httpError(400, 'contactNumber and otp are required');
  }

  const user = await User.findOne({ contactNumber });

  if (!user) {
    throw httpError(404, 'User not found for the supplied contactNumber');
  }

  if (user.otpCode !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw httpError(400, 'Invalid or expired OTP');
  }

  user.otpVerified = true;
  user.otpCode = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  res.json({
    message: 'OTP verified successfully',
    user,
  });
});

exports.logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    message: 'Logout completed',
    cleared: true,
  });
});

exports.loginWithEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw httpError(400, 'email is required');
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });

  if (!user) {
    throw httpError(404, 'No account found for this email');
  }

  res.json({
    message: 'Email verified',
    userId: user.id,
    email: user.email,
    ownerName: user.ownerName,
  });
});

exports.loginWithPassword = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw httpError(400, 'email and password are required');
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });

  if (!user) {
    throw httpError(404, 'No account found for this email');
  }

  if (!user.password) {
    user.password = String(password);
    await user.save();
  }

  if (user.password !== String(password)) {
    throw httpError(400, 'Invalid password');
  }

  res.json({
    message: 'Login successful',
    user,
  });
});

exports.requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw httpError(400, 'email is required');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    res.json({
      message: 'If this email is registered, reset instructions were sent',
      delivered: false,
    });
    return;
  }

  const otpCode = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  user.otpCode = otpCode;
  user.otpExpiresAt = otpExpiresAt;
  user.otpVerified = false;
  await user.save();

  res.json({
    message: 'Password reset requested successfully',
    delivered: true,
    email: user.email,
    otp: otpCode,
    expiresAt: otpExpiresAt,
  });
});

exports.verifyPasswordResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw httpError(400, 'email and otp are required');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw httpError(404, 'No account found for this email');
  }

  if (!user.otpCode || user.otpCode !== String(otp).trim()) {
    throw httpError(400, 'Invalid OTP');
  }

  if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw httpError(400, 'OTP has expired');
  }

  user.otpVerified = true;
  await user.save();

  res.json({
    message: 'OTP verified successfully',
    verified: true,
    email: user.email,
  });
});

exports.updatePasswordWithOtp = asyncHandler(async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  if (!email || !password || !confirmPassword) {
    throw httpError(400, 'email, password and confirmPassword are required');
  }

  if (String(password) !== String(confirmPassword)) {
    throw httpError(400, 'Passwords do not match');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw httpError(404, 'No account found for this email');
  }

  if (!user.otpVerified) {
    throw httpError(400, 'Please verify OTP first');
  }

  user.password = String(password);
  user.otpVerified = false;
  user.otpCode = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  res.json({
    message: 'Password updated successfully',
    updated: true,
    email: user.email,
  });
});

exports.googleLogin = asyncHandler(async (req, res) => {
  const { email, ownerName = 'Sports Neo User', role = 'player' } = req.body;

  if (!email) {
    throw httpError(400, 'email is required');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const generatedContact = `google-${Date.now()}`;
    user = await User.create({
      ownerName,
      email: normalizedEmail,
      contactNumber: generatedContact,
      otpVerified: true,
      role: normalizeRole(role),
    });
  }

  res.json({
    message: 'Google login successful',
    user,
  });
});