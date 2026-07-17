const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateOnly(input) {
  const text = String(input || '').trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }

  const parsed = new Date(text);
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

function toStoredDayKey(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toDateKey(value);
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (ymd) {
    return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return toDateKey(parsed);
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
  const rangeSlotIds = slots
    .filter((slot) => slot.dateFrom && slot.dateTo && !slot.date)
    .map((slot) => slot._id);

  const bookedKeysBySlotId = new Map();
  if (rangeSlotIds.length > 0 && (singleDate || fromDate || toDate)) {
    const bookingQuery = {
      groundId,
      slotId: { $in: rangeSlotIds },
      bookingStatus: { $ne: 'cancelled' },
    };

    if (singleDate) {
      const dayKey = toDateKey(singleDate);
      const endOfSingle = parseQueryDate(req.query.date, { endOfDay: true });
      bookingQuery.$or = [
        { date: dayKey },
        { dateValue: { $gte: singleDate, $lte: endOfSingle } },
      ];
    } else {
      const fromKey = fromDate ? toDateKey(fromDate) : null;
      const toKey = toDate ? toDateKey(toDate) : null;
      const dateStringRange = {};
      if (fromKey) {
        dateStringRange.$gte = fromKey;
      }
      if (toKey) {
        dateStringRange.$lte = toKey;
      }

      const dateValueRange = {};
      if (fromDate) {
        dateValueRange.$gte = fromDate;
      }
      if (toDate) {
        dateValueRange.$lte = toDate;
      }

      bookingQuery.$or = [
        ...(Object.keys(dateStringRange).length > 0
          ? [{ date: dateStringRange }]
          : []),
        ...(Object.keys(dateValueRange).length > 0
          ? [{ dateValue: dateValueRange }]
          : []),
      ];
    }

    const bookings = await Booking.find(bookingQuery)
      .select('slotId date dateValue')
      .lean();

    for (const booking of bookings) {
      const dayKey = toStoredDayKey(booking.date) || toStoredDayKey(booking.dateValue);
      if (!dayKey) {
        continue;
      }
      const key = String(booking.slotId);
      const bucket = bookedKeysBySlotId.get(key) || new Set();
      bucket.add(dayKey);
      bookedKeysBySlotId.set(key, bucket);
    }
  }

  const normalizePayloadSlot = (slot) => {
    const data = slot.toObject ? slot.toObject() : { ...slot };
    const bookedDateKeys = Array.isArray(data.bookedDates)
      ? data.bookedDates
          .map((entry) => toStoredDayKey(entry))
          .filter(Boolean)
      : [];
    const bookedFromBookings = bookedKeysBySlotId.get(String(data._id));
    data.bookedDateKeys = Array.from(
      new Set([
        ...bookedDateKeys,
        ...(bookedFromBookings ? Array.from(bookedFromBookings) : []),
      ]),
    );
    data.blockedDateKeys = Array.isArray(data.blockedDates)
      ? data.blockedDates
          .map((entry) => toStoredDayKey(entry))
          .filter(Boolean)
      : [];
    return data;
  };

  // For single-day availability, compute range-slot status against that exact date.
  if (!singleDate) {
    return res.json(slots.map(normalizePayloadSlot));
  }

  const rangeSlots = slots.filter((slot) => slot.dateFrom && slot.dateTo && !slot.date);
  const singleDayKey = toDateKey(singleDate);

  let bookedSlotIds = new Set();
  bookedSlotIds = new Set(
    Array.from(bookedKeysBySlotId.entries())
      .filter(([, keys]) => keys.has(singleDayKey))
      .map(([slotId]) => slotId),
  );

  const payload = slots.map((slot) => {
    const data = normalizePayloadSlot(slot);
    const isRangeSlot = Boolean(data.dateFrom && data.dateTo && !data.date);
    if (!isRangeSlot) {
      return data;
    }

    const fromBlockedDates = Array.isArray(data.blockedDateKeys)
      ? data.blockedDateKeys.includes(singleDayKey)
      : false;

    if (data.status === 'blocked' || fromBlockedDates) {
      data.status = 'blocked';
      return data;
    }

    const fromBookedDates = Array.isArray(data.bookedDateKeys)
      ? data.bookedDateKeys.includes(singleDayKey)
      : false;
    const isBookedForDate = bookedSlotIds.has(String(data._id)) || fromBookedDates;

    data.status = isBookedForDate ? 'booked' : 'available';
    if (!isBookedForDate) {
      data.bookedByTeam = undefined;
    }
    return data;
  });

  return res.json(payload);
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
  const slot = await Slot.findById(req.params.slotId);

  if (!slot) {
    throw httpError(404, 'Slot not found');
  }

  const blockedReason = req.body.blockedReason || 'Blocked by owner';
  const blockDateInput = req.body.date;
  const isRangeSlot = Boolean(slot.dateFrom && slot.dateTo && !slot.date);

  if (isRangeSlot && blockDateInput) {
    const blockDate = toDateOnly(blockDateInput);
    if (blockDate < slot.dateFrom || blockDate > slot.dateTo) {
      throw httpError(400, 'Date is outside slot range');
    }

    const dayKey = toDateKey(blockDate);
    const existing = Array.isArray(slot.blockedDates)
      ? slot.blockedDates.map((value) => String(value))
      : [];
    if (!existing.includes(dayKey)) {
      existing.push(dayKey);
    }
    slot.blockedDates = existing;
    if (slot.status === 'blocked') {
      slot.status = 'available';
    }
    slot.blockedReason = blockedReason;
    await slot.save();
    return res.json(slot);
  }

  slot.status = 'blocked';
  slot.blockedReason = blockedReason;
  await slot.save();

  res.json(slot);
});

exports.deleteSlot = asyncHandler(async (req, res) => {
  const slot = await Slot.findByIdAndDelete(req.params.slotId);

  if (!slot) {
    throw httpError(404, 'Slot not found');
  }

  res.status(204).send();
});