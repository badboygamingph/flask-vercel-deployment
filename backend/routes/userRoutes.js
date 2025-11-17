const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/auth');
const upload = require('../utils/multer');

router.get('/user-info', authenticateToken, userController.getUserInfo);
router.put('/users/:id', authenticateToken, userController.updateUserInfo);
router.post('/upload-profile-picture', authenticateToken, upload.single('profilePicture'), userController.uploadProfilePicture);
router.get('/profile-picture', authenticateToken, userController.getProfilePicture);
router.post('/verify-current-password', authenticateToken, userController.verifyCurrentPassword);
router.post('/change-password', authenticateToken, userController.changePassword);

module.exports = router;
