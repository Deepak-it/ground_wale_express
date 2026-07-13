const express = require('express');

const controller = require('../controllers/authController');

const router = express.Router();

router.post('/send-login-otp', controller.sendLoginOtp);
router.post('/send-register-otp', controller.sendRegisterOtp);
router.post('/send-otp', controller.sendOtp);
router.post('/verify-otp', controller.verifyOtp);
router.post('/login-with-email', controller.loginWithEmail);
router.post('/login-with-password', controller.loginWithPassword);
router.post('/google-login', controller.googleLogin);
router.post('/request-password-reset', controller.requestPasswordReset);
router.post('/verify-password-reset-otp', controller.verifyPasswordResetOtp);
router.post('/update-password-with-otp', controller.updatePasswordWithOtp);
router.post('/logout', controller.logout);

module.exports = router;