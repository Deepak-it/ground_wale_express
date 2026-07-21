const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const Ground = require('../models/Ground');
const WalletTransaction = require('../models/WalletTransaction');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

async function creditWalletForBooking(booking) {
  if (!booking.amount || booking.amount <= 0) return;

  const ground = await Ground.findById(booking.groundId).select('ownerId');
  if (!ground || !ground.ownerId) return;

  // Prevent duplicate credits for the same booking
  const existing = await WalletTransaction.findOne({
    groundId: booking.groundId,
    type: 'credit',
    subtitle: { $regex: booking._id.toString() },
  });
  if (existing) return;

  await WalletTransaction.create({
    ownerId: ground.ownerId,
    groundId: booking.groundId,
    type: 'credit',
    amount: booking.amount,
    title: `Booking - ${booking.teamName || 'Team'}`,
    subtitle: `${booking.startTime} - ${booking.endTime} | ${booking._id}`,
    status: 'success',
    occurredAt: new Date(),
  });
}

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

function toDateKey(input) {
  const localDate = toDateOnly(input);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveStatusFilter(status) {
  switch ((status || '').toLowerCase()) {
    case 'upcoming':
      return { bookingStatus: { $in: ['pending', 'confirmed'] } };
    case 'completed':
      return { bookingStatus: 'completed' };
    case 'reject':
    case 'rejected':
    case 'cancelled':
      return { bookingStatus: 'cancelled' };
    default:
      return {};
  }
}

function bookingCode(booking) {
  if (booking.bookingCode) {
    return booking.bookingCode;
  }
  const suffix = booking._id.toString().slice(-4).toUpperCase();
  return `BK-${suffix}`;
}

function serializeBooking(booking) {
  const data = booking.toObject ? booking.toObject() : booking;
  return {
    ...data,
    bookingCode: bookingCode(data),
    captainName: data.captainName || data.teamName,
    captainPhone: data.captainPhone || '',
    paymentMethod: data.paymentMethod || (data.paymentStatus === 'pending' ? 'cod' : 'upi'),
    notes: data.notes || '',
    cancellationReason: data.cancellationReason || '',
  };
}

function normalizePaymentMethod(method) {
  const value = String(method || 'upi').trim().toLowerCase();
  if (value === 'cod') {
    return 'cod';
  }
  if (value === 'cash') {
    return 'cash';
  }
  if (value === 'netbanking' || value === 'net_banking' || value === 'net banking') {
    return 'netbanking';
  }
  return 'upi';
}

exports.createBooking = asyncHandler(async (req, res) => {
  const {
    slotId,
    teamName,
    captainName,
    captainPhone,
    date,
    startTime,
    endTime,
    amount,
    paymentMethod,
    notes,
    playerCount,
  } = req.body;

  if (!slotId || !teamName || !date || !startTime || !endTime || amount == null) {
    throw httpError(400, 'slotId, teamName, date, startTime, endTime and amount are required');
  }

  const bookingDateValue = toDateOnly(date);
  const bookingDate = toDateKey(date);

  const slot = await Slot.findOne({ _id: slotId, groundId: req.params.groundId });
  if (!slot) {
    throw httpError(404, 'Slot not found for this ground');
  }

  const isRangeSlot = Boolean(slot.dateFrom && slot.dateTo && !slot.date);
  if (!isRangeSlot) {
    if (slot.status !== 'available') {
      throw httpError(400, 'Selected slot is not available');
    }
  } else {
    if (slot.status === 'blocked') {
      throw httpError(400, 'Selected slot is not available');
    }

    const slotStart = new Date(
      slot.dateFrom.getFullYear(),
      slot.dateFrom.getMonth(),
      slot.dateFrom.getDate(),
    );
    const slotEnd = new Date(
      slot.dateTo.getFullYear(),
      slot.dateTo.getMonth(),
      slot.dateTo.getDate(),
    );
    if (bookingDateValue < slotStart || bookingDateValue > slotEnd) {
      throw httpError(400, 'Selected slot is not available for this date');
    }

    const existingBooking = await Booking.findOne({
      groundId: req.params.groundId,
      slotId,
      date: bookingDate,
      bookingStatus: { $ne: 'cancelled' },
    }).lean();
    if (existingBooking) {
      throw httpError(400, 'Selected slot is already booked for this date');
    }
  }

  const method = normalizePaymentMethod(paymentMethod);
  const isOwnerBooking = String(req.body.source || '').toLowerCase() === 'owner';

  // Owner-created bookings are always confirmed immediately.
  // Sports-neo (player) bookings follow the payment-method logic.
  const bookingStatus = isOwnerBooking
    ? 'confirmed'
    : method === 'cod' ? 'pending' : 'confirmed';
  const paymentStatus = isOwnerBooking
    ? (method === 'cod' ? 'pending' : 'paid')
    : method === 'cod' ? 'pending' : 'paid';

  const booking = await Booking.create({
    groundId: req.params.groundId,
    slotId,
    teamName,
    captainName: captainName || teamName,
    captainPhone: captainPhone || '',
    date: bookingDate,
    dateValue: bookingDateValue,
    startTime,
    endTime,
    amount: Number(amount),
    paymentMethod: method,
    paymentStatus,
    bookingStatus,
    notes: notes || '',
    playerCount: Number(playerCount || 0),
  });

  if (booking.paymentStatus === 'paid') {
    await creditWalletForBooking(booking);
  }

  if (isRangeSlot) {
    const existingDates = Array.isArray(slot.bookedDates)
      ? slot.bookedDates.map((item) => String(item))
      : [];
    const sameDayExists = existingDates.some(
      (item) => item === bookingDate,
    );
    if (!sameDayExists) {
      existingDates.push(bookingDate);
    }
    slot.bookedDates = existingDates;
    slot.status = 'available';
    slot.bookedByTeam = '';
  } else {
    slot.status = 'booked';
    slot.bookedByTeam = teamName;
  }
  await slot.save();

  res.status(201).json(serializeBooking(booking));
});

exports.listBookings = asyncHandler(async (req, res) => {
  const statusFilter = resolveStatusFilter(req.query.status);
  if ((req.query.status || '').toLowerCase() === 'upcoming') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    statusFilter.dateValue = { $gte: today };
  }
  const query = {
    groundId: req.params.groundId,
    ...statusFilter,
  };
  const bookings = await Booking.find(query).sort({ dateValue: 1, startTime: 1 });
  res.json(bookings.map(serializeBooking));
});

exports.getBookingSummary = asyncHandler(async (req, res) => {
  const statusFilter = resolveStatusFilter(req.query.status);
  if ((req.query.status || '').toLowerCase() === 'upcoming') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    statusFilter.dateValue = { $gte: today };
  }
  const query = {
    groundId: req.params.groundId,
    ...statusFilter,
  };

  const bookings = await Booking.find(query).lean();
  const totalBookings = bookings.length;
  const totalRevenue = bookings
    .filter((item) => item.paymentStatus === 'paid' && item.bookingStatus !== 'cancelled')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  res.json({
    totalBookings,
    totalRevenue,
  });
});

exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking) {
    throw httpError(404, 'Booking not found');
  }

  res.json(serializeBooking(booking));
});

exports.updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking) {
    throw httpError(404, 'Booking not found');
  }

  const wasNotPaid = booking.paymentStatus !== 'paid';
  const willBePaid = req.body.paymentStatus === 'paid';

  if (req.body.bookingStatus !== undefined) booking.bookingStatus = req.body.bookingStatus;
  if (req.body.paymentStatus !== undefined) booking.paymentStatus = req.body.paymentStatus;
  await booking.save();

  if (wasNotPaid && willBePaid) {
    await creditWalletForBooking(booking);
  }

  res.json(serializeBooking(booking));
});

exports.acceptBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(
    req.params.bookingId,
    {
      $set: {
        bookingStatus: 'confirmed',
      },
    },
    { new: true, runValidators: true },
  );

  if (!booking) {
    throw httpError(404, 'Booking not found');
  }

  res.json(serializeBooking(booking));
});

exports.rejectBooking = asyncHandler(async (req, res) => {
  const reason = req.body.reason || 'Not Available';
  const booking = await Booking.findByIdAndUpdate(
    req.params.bookingId,
    {
      $set: {
        bookingStatus: 'cancelled',
        cancellationReason: reason,
      },
    },
    { new: true, runValidators: true },
  );

  if (!booking) {
    throw httpError(404, 'Booking not found');
  }

  res.json(serializeBooking(booking));
});

exports.collectCodPayment = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking) {
    throw httpError(404, 'Booking not found');
  }

  if ((booking.paymentMethod || 'upi') !== 'cod') {
    throw httpError(400, 'Booking payment method is not COD');
  }

  const wasNotPaid = booking.paymentStatus !== 'paid';
  booking.paymentStatus = 'paid';
  booking.bookingStatus = booking.bookingStatus === 'pending' ? 'confirmed' : booking.bookingStatus;
  await booking.save();

  if (wasNotPaid) {
    await creditWalletForBooking(booking);
  }

  res.json(serializeBooking(booking));
});