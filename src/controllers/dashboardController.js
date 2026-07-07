const Booking = require('../models/Booking');
const Ground = require('../models/Ground');
const Slot = require('../models/Slot');
const WalletTransaction = require('../models/WalletTransaction');
const asyncHandler = require('../utils/asyncHandler');

exports.getDashboard = asyncHandler(async (req, res) => {
  const ownerId = req.params.ownerId;
  const grounds = await Ground.find({ ownerId });
  const groundIds = grounds.map((ground) => ground._id);

  const [slotCount, liveBookings, earnings] = await Promise.all([
    Slot.countDocuments({ groundId: { $in: groundIds } }),
    Booking.countDocuments({ groundId: { $in: groundIds }, bookingStatus: 'confirmed' }),
    WalletTransaction.aggregate([
      {
        $match: {
          groundId: { $in: groundIds },
          type: 'credit',
          status: 'success',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  res.json({
    groundsRegistered: grounds.length,
    slotsCreated: slotCount,
    liveBookings,
    totalEarnings: earnings[0]?.total || 0,
    reviewBreakdown: {
      draft: grounds.filter((ground) => ground.reviewStatus === 'draft').length,
      underReview: grounds.filter((ground) => ground.reviewStatus === 'under_review').length,
      approved: grounds.filter((ground) => ground.reviewStatus === 'approved').length,
      rejected: grounds.filter((ground) => ground.reviewStatus === 'rejected').length,
    },
  });
});

exports.getBoxCricketDashboard = asyncHandler(async (req, res) => {
  const ownerId = req.params.ownerId;
  const grounds = await Ground.find({ ownerId }).select('_id');
  const groundIds = grounds.map((ground) => ground._id);

  if (groundIds.length === 0) {
    return res.json({
      todaysEarnings: 0,
      upcomingBookings: [],
      slotStatus: { available: 0, booked: 0, blocked: 0 },
      teamActivity: {
        mostActiveTeam: 'No bookings yet',
        repeatTeams: '0 Times',
      },
    });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [todayBookings, upcomingBookings, slotCounts, teamAgg] = await Promise.all([
    Booking.find({
      groundId: { $in: groundIds },
      date: { $gte: startOfDay, $lt: endOfDay },
      bookingStatus: { $ne: 'cancelled' },
      paymentStatus: 'paid',
    }).lean(),
    Booking.find({
      groundId: { $in: groundIds },
      date: { $gte: startOfDay },
      bookingStatus: { $in: ['pending', 'confirmed'] },
    })
      .sort({ date: 1, startTime: 1 })
      .limit(6)
      .lean(),
    Slot.aggregate([
      {
        $match: {
          groundId: { $in: groundIds },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          groundId: { $in: groundIds },
          bookingStatus: { $ne: 'cancelled' },
          teamName: { $exists: true, $ne: '' },
        },
      },
      {
        $group: {
          _id: '$teamName',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]),
  ]);

  const todaysEarnings = todayBookings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const slotStatus = { available: 0, booked: 0, blocked: 0 };
  slotCounts.forEach((row) => {
    if (row._id === 'available') {
      slotStatus.available = row.count;
    }
    if (row._id === 'booked') {
      slotStatus.booked = row.count;
    }
    if (row._id === 'blocked') {
      slotStatus.blocked = row.count;
    }
  });

  const mostActive = teamAgg[0]
    ? `${teamAgg[0]._id} (${teamAgg[0].count} bookings)`
    : 'No bookings yet';
  const repeatTeamCount = teamAgg.filter((team) => team.count > 1).length;

  return res.json({
    todaysEarnings,
    upcomingBookings: upcomingBookings.map((booking) => ({
      id: booking._id,
      timeRange: `${booking.startTime} - ${booking.endTime}`,
      startTime: booking.startTime,
      endTime: booking.endTime,
      teamName: booking.teamName,
      players: booking.playerCount || 0,
      amount: booking.amount || 0,
      amountLabel:
        booking.paymentStatus === 'pending' ? 'Pending' : `Rs ${booking.amount || 0}`,
      paymentLabel: booking.paymentStatus === 'paid' ? 'Paid' : (booking.paymentMethod || 'COD').toUpperCase(),
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      bookingStatus: booking.bookingStatus,
      date: booking.date,
      captainName: booking.captainName,
      captainPhone: booking.captainPhone,
    })),
    slotStatus,
    teamActivity: {
      mostActiveTeam: mostActive,
      repeatTeams: `${repeatTeamCount} Times`,
    },
  });
});