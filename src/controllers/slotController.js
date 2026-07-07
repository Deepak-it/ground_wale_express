const Slot = require('../models/Slot');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.listSlots = asyncHandler(async (req, res) => {
  const query = { groundId: req.params.groundId };

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.from || req.query.to) {
    query.date = {};
    if (req.query.from) {
      query.date.$gte = new Date(req.query.from);
    }
    if (req.query.to) {
      const end = new Date(req.query.to);
      end.setHours(23, 59, 59, 999);
      query.date.$lte = end;
    }
  } else if (req.query.date) {
    query.date = new Date(req.query.date);
  }

  const slots = await Slot.find(query).sort({ date: 1, startTime: 1 });
  res.json(slots);
});

exports.createSlot = asyncHandler(async (req, res) => {
  const slot = await Slot.create({
    ...req.body,
    groundId: req.params.groundId,
  });

  res.status(201).json(slot);
});

exports.updateSlot = asyncHandler(async (req, res) => {
  const slot = await Slot.findByIdAndUpdate(req.params.slotId, req.body, {
    new: true,
    runValidators: true,
  });

  if (!slot) {
    throw httpError(404, 'Slot not found');
  }

  res.json(slot);
});

exports.blockSlot = asyncHandler(async (req, res) => {
  const slot = await Slot.findByIdAndUpdate(
    req.params.slotId,
    {
      $set: {
        status: 'blocked',
        blockedReason: req.body.blockedReason || 'Blocked by owner',
      },
    },
    { new: true },
  );

  if (!slot) {
    throw httpError(404, 'Slot not found');
  }

  res.json(slot);
});

exports.deleteSlot = asyncHandler(async (req, res) => {
  const slot = await Slot.findByIdAndDelete(req.params.slotId);

  if (!slot) {
    throw httpError(404, 'Slot not found');
  }

  res.status(204).send();
});