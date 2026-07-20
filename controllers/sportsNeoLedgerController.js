const asyncHandler = require('../utils/asyncHandler');

function mockEntries() {
  return [
    {
      id: 'captain',
      index: 1,
      title: 'Rakesh Sharma (Captain)',
      subtitle: 'Settled',
      amount: 5150,
      isCredit: true,
      hasWhatsapp: true,
      phone: '+91 9876543210',
    },
    {
      id: 'opponent',
      index: 2,
      title: 'Manu XI',
      subtitle: 'Total Pending 300',
      amount: 250,
      isCredit: false,
      hasWhatsapp: true,
      phone: '+91 9876543210',
    },
    {
      id: 'sarpanch',
      index: 3,
      title: 'Sarpanch',
      subtitle: 'Advance 750',
      amount: 250,
      isCredit: false,
      hasWhatsapp: true,
      phone: '+91 9876543210',
    },
  ];
}

exports.getLedgerHome = asyncHandler(async (_req, res) => {
  res.json({
    title: 'Ledger & Payment',
    netBalance: -3,
    netPositive: false,
    addReceiptLabel: 'Add Receipt',
    addPaymentLabel: 'Add Payment',
    entries: mockEntries(),
  });
});

exports.getMatchLedger = asyncHandler(async (_req, res) => {
  res.json({
    matchTitle: 'Manu Xi vs Thunderbolt XI',
    netBalance: -3,
    netPositive: false,
    bookingTitle: 'Booking Details',
    bookingGround: 'Green Valley Cricket Ground',
    bookingDate: 'Wednesday, Apr 8, 2026',
    bookingTime: '6:00 AM - 8:00 AM',
    matchAmount: 5000,
    paymentLines: [
      { label: 'Ground Fee', amount: 5000 },
      { label: 'Red ball (1)', amount: 150 },
      { label: 'Discount', amount: 0 },
    ],
    transactions: mockEntries(),
  });
});

exports.getPendingLedger = asyncHandler(async (_req, res) => {
  res.json({
    title: 'Pending Payment',
    netBalance: 3500,
    netPositive: false,
    addReceiptLabel: 'Share',
    addPaymentLabel: 'WhatsApp',
    entries: mockEntries().map((item) => ({ ...item, isCredit: false })),
  });
});

exports.getAdvanceLedger = asyncHandler(async (_req, res) => {
  res.json({
    title: 'Advance Payment',
    netBalance: 3500,
    netPositive: true,
    addReceiptLabel: 'Share',
    addPaymentLabel: 'WhatsApp',
    entries: mockEntries().map((item) => ({ ...item, isCredit: true })),
  });
});

exports.getSarpanchLedger = asyncHandler(async (_req, res) => {
  res.json({
    matchTitle: 'Sarpanch',
    netBalance: 2900,
    netPositive: true,
    bookingTitle: 'Transaction History',
    bookingGround: 'Sector 22 Turf',
    bookingDate: '30-12-2026',
    bookingTime: '6:00 AM - 8:00 AM',
    matchAmount: 100,
    paymentLines: [
      { label: 'Total Paid', amount: 700 },
      { label: 'Total Expense', amount: 200 },
      { label: 'Matches Played', amount: 5 },
    ],
    transactions: [
      {
        id: 'fee',
        index: 1,
        title: 'Match Fee vs Manu XI',
        subtitle: '30-12-2026',
        amount: 100,
        isCredit: false,
      },
      {
        id: 'added',
        index: 2,
        title: 'Amount Added',
        subtitle: 'UPI',
        amount: 1000,
        isCredit: true,
      },
    ],
  });
});

exports.addPayment = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, kind: 'payment', payload: req.body || {} });
});

exports.addReceipt = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, kind: 'receipt', payload: req.body || {} });
});

exports.replacePlayer = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, replacement: req.body || {} });
});

exports.sendPendingReminder = asyncHandler(async (_req, res) => {
  res.status(201).json({ success: true, message: 'Pending payment reminder shared' });
});

exports.sendAdvanceUpdate = asyncHandler(async (_req, res) => {
  res.status(201).json({ success: true, message: 'Advance payment update shared' });
});
