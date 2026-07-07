const SupportTicket = require('../models/SupportTicket');
const asyncHandler = require('../utils/asyncHandler');

exports.createTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.create(req.body);
  res.status(201).json(ticket);
});