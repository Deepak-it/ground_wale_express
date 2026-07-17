const Booking = require('../models/Booking');
const WalletTransaction = require('../models/WalletTransaction');
const asyncHandler = require('../utils/asyncHandler');

exports.getEarningsReport = asyncHandler(async (req, res) => {
  const { groundId } = req.params;
  const from = req.query.from ? new Date(req.query.from) : new Date('1970-01-01');
  const to = req.query.to ? new Date(req.query.to) : new Date();

  const [bookings, transactions] = await Promise.all([
    Booking.find({
      groundId,
      $or: [
        { dateValue: { $gte: from, $lte: to } },
        { date: { $gte: from, $lte: to } },
      ],
    }).sort({ dateValue: -1, date: -1 }),
    WalletTransaction.find({
      groundId,
      occurredAt: { $gte: from, $lte: to },
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
    from,
    to,
    grossRevenue,
    settledCredits,
    withdrawals,
    bookings,
    transactions,
  });
});