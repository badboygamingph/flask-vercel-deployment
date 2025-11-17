const db = require('../db');
const fs = require('fs');
const config = require('../config/config');

exports.createAccount = (req, res) => {
    const { site, username, password } = req.body;
    const userId = req.user.id;

    if (!site || !username || !password) {
        return res.status(400).json({ success: false, message: 'Site, username, and password are required.' });
    }

    let imagePath = 'images/default.png';
    if (req.file) {
        imagePath = `images/${req.file.filename}`;
    } else if (req.body.image === 'images/default.png') {
        imagePath = 'images/default.png';
    }

    const sql = "INSERT INTO accounts (site, username, password, image, user_id) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [site, username, password, imagePath, userId], (err, result) => {
        if (err) {
            console.error(err);
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
            return res.status(500).json({ success: false, message: 'Error creating account.' });
        }
        res.json({ success: true, message: 'Account created successfully!', accountId: result.insertId });
    });
};

exports.getAccounts = (req, res) => {
    console.log('/accounts: Request received for user ID:', req.user.id);
    const userId = req.user.id;
    const sql = "SELECT id, site, username, password, image FROM accounts WHERE user_id = ?";
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('/accounts: DB Error reading accounts:', err);
            return res.status(500).json({ success: false, message: 'Error reading accounts.' });
        }
        const accountsWithFullImageUrls = results.map(account => {
            if (account.image && !account.image.startsWith('http')) {
                account.image = `${config.BASE_URL}/${account.image.replace(/\\/g, '/')}`;
            }
            return account;
        });
        console.log('/accounts: Successfully retrieved accounts for user ID:', userId, 'Count:', results.length);
        res.json({ success: true, message: 'Accounts retrieved successfully!', accounts: accountsWithFullImageUrls });
    });
};

exports.updateAccount = (req, res) => {
    const accountId = req.params.id;
    const { site, username, password } = req.body;
    const userId = req.user.id;

    if (!site || !username || !password) {
        return res.status(400).json({ success: false, message: 'Site, username, and password are required.' });
    }

    let imagePath = req.body.currentImage;
    if (req.file) {
        imagePath = `images/${req.file.filename}`;
    }

    const sql = "UPDATE accounts SET site = ?, username = ?, password = ?, image = ? WHERE id = ? AND user_id = ?";
    db.query(sql, [site, username, password, imagePath, accountId, userId], (err, result) => {
        if (err) {
            console.error(err);
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
            return res.status(500).json({ success: false, message: 'Error updating account.' });
        }
        if (result.affectedRows === 0) {
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
            return res.status(404).json({ success: false, message: 'Account not found or you do not have permission to update it.' });
        }
        res.json({ success: true, message: 'Account updated successfully!', image: imagePath });
    });
};

exports.deleteAccount = (req, res) => {
    const accountId = req.params.id;
    const userId = req.user.id;

    const sql = "DELETE FROM accounts WHERE id = ? AND user_id = ?";
    db.query(sql, [accountId, userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error deleting account.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Account not found or you do not have permission to delete it.' });
        }
        res.json({ success: true, message: 'Account deleted successfully!' });
    });
};
