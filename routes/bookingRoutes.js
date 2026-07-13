const express = require('express');

const controller = require('../controllers/bookingController');

const router = express.Router();

router.get('/:bookingId', controller.getBooking);
router.patch('/:bookingId/status', controller.updateBookingStatus);
router.post('/:bookingId/accept', controller.acceptBooking);
router.post('/:bookingId/reject', controller.rejectBooking);
router.post('/:bookingId/cod/collect', controller.collectCodPayment);

module.exports = router;