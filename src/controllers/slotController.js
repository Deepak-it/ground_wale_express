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
  const groundId = req.params.groundId;

  const fromDate = req.query.from ? parseQueryDate(req.query.from) : null;
  const toDate   = req.query.to   ? parseQueryDate(req.query.to, { endOfDay: true })
                 : req.query.date  ? parseQueryDate(req.query.date, { endOfDay: true })
                 : null;
  const singleDate = req.query.date ? parseQueryDate(req.query.date) : null;

  // Build a query that matches BOTH range-based slots AND legacy single-date slots
  const dateFilter = [];

  if (fromDate || toDate) {
    // Range slots that overlap the requested window
    const rangeClause = { groundId, dateFrom: { $exists: true } };
    if (fromDate) rangeClause.dateTo   = { $gte: fromDate };
    if (toDate)   rangeClause.dateFrom = { ...rangeClause.dateFrom, $lte: toDate };
    dateFilter.push(rangeClause);

    // Legacy single-date slots inside the window
    const legacyClause = { groundId, date: { $exists: true } };
    if (fromDate) legacyClause.date.$gte = fromDate;
    if (toDate)   legacyClause.date.$lte = toDate;
    dateFilter.push(legacyClause);
  } else if (singleDate) {
    const endOfSingle = parseQueryDate(req.query.date, { endOfDay: true });
    // Range slot covers this date
    dateFilter.push({ groundId, dateFrom: { $lte: endOfSingle }, dateTo: { $gte: singleDate } });
    // Legacy single-date slot
    dateFilter.push({ groundId, date: { $gte: singleDate, $lte: endOfSingle } });
  } else {
    dateFilter.push({ groundId });
  }

  const baseQuery = dateFilter.length > 1 ? { $or: dateFilter } : dateFilter[0];
  if (req.query.status) baseQuery.status = req.query.status;

  const slots = await Slot.find(baseQuery).sort({ dateFrom: 1, date: 1, startTime: 1 });
  res.json(slots);
});

exports.createSlot = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, date, startTime, endTime, price, status, blockedReason, notes } = req.body;

  // ── Range-based slot: store ONE record (no per-day loop) ──────────────────
  if (dateFrom && dateTo) {
    const slot = await Slot.create({
      groundId: req.params.groundId,
      dateFrom: toDateOnly(dateFrom),
      dateTo:   toDateOnly(dateTo),
      startTime,
      endTime,
      price:  price  || 0,
      status: status || 'available',
      blockedReason,
      notes,
    });
    return res.status(201).json(slot);
  }

  // ── Single-date slot (legacy / specific booking) ───────────────────────
  if (!date) throw httpError(400, 'date or dateFrom+dateTo is required');

  const slotDate = toDateOnly(date);
  const slot = await Slot.create({
    ...req.body,
    groundId: req.params.groundId,
    date: slotDate,
    day: WEEKDAY_SHORT[slotDate.getDay()],
  });
  return res.status(201).json(slot);
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