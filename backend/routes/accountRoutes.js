const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const authenticateToken = require('../middleware/auth');
const upload = require('../utils/multer');

router.post('/accounts', authenticateToken, upload.single('image'), accountController.createAccount);
router.get('/accounts', authenticateToken, accountController.getAccounts);
router.put('/accounts/:id', authenticateToken, upload.single('image'), accountController.updateAccount);
router.delete('/accounts/:id', authenticateToken, accountController.deleteAccount);

module.exports = router;
