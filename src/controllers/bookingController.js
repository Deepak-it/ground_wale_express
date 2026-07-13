const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

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

  const bookingDate = toDateOnly(date);

  const slot = await Slot.findOne({ _id: slotId, groundId: req.params.groundId });
  if (!slot) {
    throw httpError(404, 'Slot not found for this ground');
  }

  if (slot.status !== 'available') {
    throw httpError(400, 'Selected slot is not available');
  }

  const method = normalizePaymentMethod(paymentMethod);
  const booking = await Booking.create({
    groundId: req.params.groundId,
    slotId,
    teamName,
    captainName: captainName || teamName,
    captainPhone: captainPhone || '',
    date: bookingDate,
    startTime,
    endTime,
    amount: Number(amount),
    paymentMethod: method,
    paymentStatus: method === 'cod' ? 'pending' : 'paid',
    bookingStatus: method === 'cod' ? 'pending' : 'confirmed',
    notes: notes || '',
    playerCount: Number(playerCount || 0),
  });

  slot.status = 'booked';
  slot.bookedByTeam = teamName;
  await slot.save();

  res.status(201).json(serializeBooking(booking));
});

exports.listBookings = asyncHandler(async (req, res) => {
  const query = {
    groundId: req.params.groundId,
    ...resolveStatusFilter(req.query.status),
  };
  const bookings = await Booking.find(query).sort({ date: 1, startTime: 1 });
  res.json(bookings.map(serializeBooking));
});

exports.getBookingSummary = asyncHandler(async (req, res) => {
  const query = {
    groundId: req.params.groundId,
    ...resolveStatusFilter(req.query.status),
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
  const booking = await Booking.findByIdAndUpdate(
    req.params.bookingId,
    {
      $set: {
        bookingStatus: req.body.bookingStatus,
        paymentStatus: req.body.paymentStatus,
      },
    },
    { new: true, runValidators: true },
  );

  if (!booking) {
    throw httpError(404, 'Booking not found');
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

  booking.paymentStatus = 'paid';
  booking.bookingStatus = booking.bookingStatus === 'pending' ? 'confirmed' : booking.bookingStatus;
  await booking.save();

  res.json(serializeBooking(booking));
});