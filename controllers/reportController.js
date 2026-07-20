const Booking = require('../models/Booking');
const WalletTransaction = require('../models/WalletTransaction');
const asyncHandler = require('../utils/asyncHandler');

exports.getEarningsReport = asyncHandler(async (req, res) => {
  const { groundId } = req.params;

  const fromStr = req.query.from || '1970-01-01';
  const toStr = req.query.to || new Date().toISOString().split('T')[0];

  // Date objects for dateValue (Date type) comparison — to covers full day in UTC
  const fromDate = new Date(fromStr);
  const toDate = new Date(toStr);
  toDate.setUTCHours(23, 59, 59, 999);

  const [bookings, transactions] = await Promise.all([
    Booking.find({
      groundId,
      $or: [
        { dateValue: { $gte: fromDate, $lte: toDate } },
        { date: { $gte: fromStr, $lte: toStr } },   // string-to-string: safe lexicographic compare
      ],
    }).sort({ dateValue: -1, date: -1 }),
    WalletTransaction.find({
      groundId,
      occurredAt: { $gte: fromDate, $lte: toDate },
    }).sort({ occurredAt: -1 }),
  ]);

  const grossRevenue = bookings.reduce((sum, booking) => sum + booking.amount, 0);
  const settledCredits = transactions
    .filter((transaction) => transaction.type === 'credit' && transaction.status === 'success')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const withdrawals = transactions
    .filter((transaction) => transaction.type === 'withdrawal')
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  res.json({
    from: fromDate,
    to: toDate,
    grossRevenue,
    settledCredits,
    withdrawals,
    bookings,
    transactions,
  });
});