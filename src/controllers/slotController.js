const Slot = require('../models/Slot');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateOnly(input) {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw httpError(400, 'Invalid date value');
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function parseQueryDate(input, { endOfDay = false } = {}) {
  if (!input) {
    return null;
  }

  const value = String(input).trim();
  const yyyyMmDdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (yyyyMmDdMatch) {
    const year = Number(yyyyMmDdMatch[1]);
    const month = Number(yyyyMmDdMatch[2]);
    const day = Number(yyyyMmDdMatch[3]);
    return endOfDay
      ? new Date(year, month - 1, day, 23, 59, 59, 999)
      : new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw httpError(400, 'Invalid date value');
  }

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }
  return parsed;
}

function toDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

exports.listSlots = asyncHandler(async (req, res) => {
  const query = { groundId: req.params.groundId };

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.from || req.query.to) {
    query.date = {};
    if (req.query.from) {
      query.date.$gte = parseQueryDate(req.query.from);
    }
    if (req.query.to) {
      query.date.$lte = parseQueryDate(req.query.to, { endOfDay: true });
    }
  } else if (req.query.date) {
    query.date = {
      $gte: parseQueryDate(req.query.date),
      $lte: parseQueryDate(req.query.date, { endOfDay: true }),
    };
  }

  const slots = await Slot.find(query).sort({ date: 1, startTime: 1 });
  res.json(slots);
});

exports.createSlot = asyncHandler(async (req, res) => {
  const {
    dateFrom,
    dateTo,
    date,
    startTime,
    endTime,
    price,
    status,
    blockedReason,
    notes,
  } = req.body;

  if (!dateFrom && !dateTo) {
    if (!date) {
      throw httpError(400, 'date is required');
    }

    const slotDate = toDateOnly(date);

    const slot = await Slot.create({
      ...req.body,
      groundId: req.params.groundId,
      date: slotDate,
      day: WEEKDAY_SHORT[slotDate.getDay()],
    });

    return res.status(201).json(slot);
  }

  const startDate = toDateOnly(dateFrom || date);
  const endDate = toDateOnly(dateTo || dateFrom || date);

  if (endDate.getTime() < startDate.getTime()) {
    throw httpError(400, 'dateTo must be greater than or equal to dateFrom');
  }

  const createdSlots = [];
  const skippedDates = [];

  for (
    let cursor = new Date(startDate);
    cursor.getTime() <= endDate.getTime();
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
  ) {
    const slotDate = new Date(cursor);
    const existing = await Slot.findOne({
      groundId: req.params.groundId,
      date: slotDate,
      startTime,
      endTime,
    }).lean();

    if (existing) {
      skippedDates.push(toDateKey(slotDate));
      continue;
    }

    const created = await Slot.create({
      groundId: req.params.groundId,
      date: slotDate,
      day: WEEKDAY_SHORT[slotDate.getDay()],
      startTime,
      endTime,
      price,
      status,
      blockedReason,
      notes,
    });
    createdSlots.push(created);
  }

  return res.status(201).json({
    createdCount: createdSlots.length,
    skippedCount: skippedDates.length,
    slots: createdSlots,
    skippedDates,
  });
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