const express = require('express');

const authRoutes = require('./authRoutes');
const ownerRoutes = require('./ownerRoutes');
const groundRoutes = require('./groundRoutes');
const slotRoutes = require('./slotRoutes');
const bookingRoutes = require('./bookingRoutes');
const supportRoutes = require('./supportRoutes');
const policyRoutes = require('./policyRoutes');
const academyRoutes = require('./academyRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/owners', ownerRoutes);
router.use('/grounds', groundRoutes);
router.use('/slots', slotRoutes);
router.use('/bookings', bookingRoutes);
router.use('/support', supportRoutes);
router.use('/policies', policyRoutes);
router.use('/academy', academyRoutes);

module.exports = router;