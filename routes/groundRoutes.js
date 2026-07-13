const express = require('express');

const controller = require('../controllers/groundController');
const slotController = require('../controllers/slotController');
const bookingController = require('../controllers/bookingController');
const walletController = require('../controllers/walletController');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.post('/', controller.createGround);
router.get('/', controller.listGrounds);
router.get('/:groundId', controller.getGround);
router.patch('/:groundId', controller.updateGround);
router.post('/:groundId/submit-review', controller.submitForReview);
router.get('/:groundId/review-status', controller.getReviewStatus);
router.patch('/:groundId/facilities', controller.updateFacilities);
router.patch('/:groundId/pricing', controller.updatePricing);
router.patch('/:groundId/ownership-verification', controller.updateOwnershipVerification);

router.get('/:groundId/slots', slotController.listSlots);
router.post('/:groundId/slots', slotController.createSlot);

router.get('/:groundId/bookings', bookingController.listBookings);
router.post('/:groundId/bookings', bookingController.createBooking);
router.get('/:groundId/bookings/summary', bookingController.getBookingSummary);

router.get('/:groundId/wallet', walletController.getWallet);
router.get('/:groundId/wallet/transactions', walletController.listTransactions);
router.post('/:groundId/wallet/withdraw', walletController.withdraw);

router.get('/:groundId/reports/earnings', reportController.getEarningsReport);

module.exports = router;