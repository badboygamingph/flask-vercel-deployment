const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

router.post('/request-otp', authController.requestOtp);
router.post('/forgot-password/request-otp', authController.requestPasswordResetOtp);
router.post('/verify-otp-and-register', authController.verifyOtpAndRegister);
router.post('/forgot-password/verify-otp', authController.verifyPasswordResetOtp);
router.post('/forgot-password/reset', authController.resetPassword);
router.post('/login', authController.login);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
