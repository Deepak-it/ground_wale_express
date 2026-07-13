const Ground = require('../models/Ground');
const WalletTransaction = require('../models/WalletTransaction');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

async function loadGroundOrThrow(groundId) {
  const ground = await Ground.findById(groundId);

  if (!ground) {
    throw httpError(404, 'Ground not found');
  }

  return ground;
}

exports.getWallet = asyncHandler(async (req, res) => {
  const ground = await loadGroundOrThrow(req.params.groundId);
  const transactions = await WalletTransaction.find({ groundId: ground.id }).sort({ occurredAt: -1 });

  const summary = transactions.reduce(
    (accumulator, transaction) => {
      if (transaction.type === 'credit') {
        accumulator.totalCredits += transaction.amount;
      } else if (transaction.type === 'withdrawal') {
        accumulator.totalWithdrawals += Math.abs(transaction.amount);
      }

      if (transaction.status === 'pending') {
        accumulator.pending += Math.abs(transaction.amount);
      }

      return accumulator;
    },
    { totalCredits: 0, totalWithdrawals: 0, pending: 0 },
  );

  const available = summary.totalCredits - summary.totalWithdrawals - summary.pending;

  res.json({
    ownerId: ground.ownerId,
    groundId: ground.id,
    totalBalance: summary.totalCredits - summary.totalWithdrawals,
    availableBalance: available,
    pendingBalance: summary.pending,
    transactions,
  });
});

exports.listTransactions = asyncHandler(async (req, res) => {
  await loadGroundOrThrow(req.params.groundId);

  const query = { groundId: req.params.groundId };
  if (req.query.type) {
    query.type = req.query.type;
  }

  const transactions = await WalletTransaction.find(query).sort({ occurredAt: -1 });
  res.json(transactions);
});

exports.withdraw = asyncHandler(async (req, res) => {
  const ground = await loadGroundOrThrow(req.params.groundId);
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    throw httpError(400, 'amount must be greater than zero');
  }

  const transaction = await WalletTransaction.create({
    ownerId: ground.ownerId,
    groundId: ground.id,
    type: 'withdrawal',
    amount: -Math.abs(amount),
    title: 'Withdrawn to bank',
    subtitle: req.body.subtitle || 'Manual payout request',
    status: 'pending',
  });

  res.status(201).json(transaction);
});