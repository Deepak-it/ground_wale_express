const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ ownerId: req.params.ownerId }).sort({ createdAt: -1 });
  res.json(notifications);
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, ownerId: req.params.ownerId },
    { $set: { isRead: true } },
    { new: true },
  );

  if (!notification) {
    throw httpError(404, 'Notification not found');
  }

  res.json(notification);
});