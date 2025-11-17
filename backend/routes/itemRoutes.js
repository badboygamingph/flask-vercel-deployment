const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const authenticateToken = require('../middleware/auth');

router.post('/create', authenticateToken, itemController.createItem);
router.get('/read', authenticateToken, itemController.readItems);
router.put('/update', authenticateToken, itemController.updateItem);
router.delete('/delete', authenticateToken, itemController.deleteItem);

module.exports = router;
