/**
 * One-time script: creates WalletTransaction credits for all existing paid
 * bookings that do not already have a corresponding wallet credit.
 *
 * Run from the express/ directory:
 *   node scripts/backfill-wallet-credits.js
 */

'use strict';

const mongoose = require('mongoose');
const { connectToDatabase } = require('../config/db');

const Booking = require('../models/Booking');
const Ground = require('../models/Ground');
const WalletTransaction = require('../models/WalletTransaction');

async function run() {
  await connectToDatabase();

  const paidBookings = await Booking.find({
    paymentStatus: 'paid',
    amount: { $gt: 0 },
    bookingStatus: { $ne: 'cancelled' },
  });

  console.log(`Found ${paidBookings.length} paid booking(s) with amount > 0`);

  let created = 0;
  let skipped = 0;

  for (const booking of paidBookings) {
    // Check if a credit already exists for this booking
    const existing = await WalletTransaction.findOne({
      groundId: booking.groundId,
      type: 'credit',
      subtitle: { $regex: booking._id.toString() },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const ground = await Ground.findById(booking.groundId).select('ownerId');
    if (!ground || !ground.ownerId) {
      console.warn(`  Skipping booking ${booking._id} — ground/ownerId not found`);
      skipped++;
      continue;
    }

    await WalletTransaction.create({
      ownerId: ground.ownerId,
      groundId: booking.groundId,
      type: 'credit',
      amount: booking.amount,
      title: `Booking - ${booking.teamName || 'Team'}`,
      subtitle: `${booking.startTime} - ${booking.endTime} | ${booking._id}`,
      status: 'success',
      occurredAt: booking.createdAt || new Date(),
    });

    console.log(`  Created credit Rs ${booking.amount} for booking ${booking._id} (${booking.teamName})`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped (already existed): ${skipped}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
