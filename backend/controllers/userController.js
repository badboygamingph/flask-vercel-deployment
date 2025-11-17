const db = require('../db');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, BASE_URL } = require('../config/config');

exports.getUserInfo = (req, res) => {
    const userId = req.user.id;
    const sql = "SELECT id, firstname, middlename, lastname, email, profilePicture FROM users WHERE id = ?";
    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'An error occurred.' });
        }
        if (result.length > 0) {
            const user = result[0];
            if (user.profilePicture && !user.profilePicture.startsWith('http')) {
                user.profilePicture = `${BASE_URL}/${user.profilePicture.replace(/\\/g, '/')}`;
            }
            res.json({ success: true, user: user });
        } else {
            res.status(404).json({ success: false, message: 'User not found.' });
        }
    });
};

exports.updateUserInfo = (req, res) => {
    const userId = req.params.id;
    const { firstname, middlename, lastname, email } = req.body;

    if (req.user.id != userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized to update this user.' });
    }

    if (!firstname || !lastname || !email) {
        return res.status(400).json({ success: false, message: 'First name, last name, and email are required.' });
    }

    const sql = "UPDATE users SET firstname = ?, middlename = ?, lastname = ?, email = ? WHERE id = ?";
    db.query(sql, [firstname, middlename, lastname, email, userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error updating user information.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found or no changes made.' });
        }
        res.json({ success: true, message: 'Account information updated successfully!' });
    });
};

exports.uploadProfilePicture = (req, res) => {
    const userId = req.user.id;
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const profilePicturePath = `/images/${req.file.filename}`;

    const sql = "UPDATE users SET profilePicture = ? WHERE id = ?";
    db.query(sql, [profilePicturePath, userId], (err, result) => {
        if (err) {
            console.error('Error updating profile picture in DB:', err);
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
            });
            return res.status(500).json({ success: false, message: 'Error saving profile picture.' });
        }
        if (result.affectedRows === 0) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
            });
            return res.status(404).json({ success: false, message: 'User not found or you do not have permission to update profile picture.' });
        }
        const fullProfilePicturePath = `${BASE_URL}${profilePicturePath.replace(/\\/g, '/')}`;
        res.json({ success: true, message: 'Profile picture updated successfully!', profilePicture: fullProfilePicturePath });
    });
};

exports.getProfilePicture = (req, res) => {
    const userId = req.user.id;
    const sql = "SELECT profilePicture FROM users WHERE id = ?";
    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'An error occurred.' });
        }
        if (result.length > 0) {
            let profilePicture = result[0].profilePicture;
            if (profilePicture && !profilePicture.startsWith('http')) {
                profilePicture = `${BASE_URL}/${profilePicture.replace(/\\/g, '/')}`;
            }
            res.json({ success: true, profilePicture: profilePicture });
        } else {
            res.status(404).json({ success: false, message: 'User not found.' });
        }
    });
};

exports.verifyCurrentPassword = (req, res) => {
    const { currentPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required.' });
    }

    const sql = "SELECT password FROM users WHERE id = ?";
    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'An error occurred.' });
        }
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const hashedPassword = result[0].password;
        bcrypt.compare(currentPassword, hashedPassword, (compareErr, isMatch) => {
            if (compareErr) {
                console.error(compareErr);
                return res.status(500).json({ success: false, message: 'An error occurred during password comparison.' });
            }
            if (isMatch) {
                res.json({ success: true, message: 'Current password matches.' });
            } else {
                res.status(401).json({ success: false, message: 'Current password does not match.' });
            }
        });
    });
};

exports.changePassword = (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    console.log('/change-password: Request received for user ID:', userId, 'Email:', userEmail);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ success: false, message: 'All password fields are required.' });
    }

    if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
    }

    const checkSql = "SELECT password FROM users WHERE id = ?";
    db.query(checkSql, [userId], (err, result) => {
        if (err) {
            console.error('/change-password: Error verifying current password from DB:', err);
            return res.status(500).json({ success: false, message: 'An error occurred while verifying current password.' });
        }
        if (result.length === 0) {
            console.log('/change-password: User not found for ID:', userId);
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const hashedPassword = result[0].password;
        bcrypt.compare(currentPassword, hashedPassword, (compareErr, isMatch) => {
            if (compareErr) {
                console.error('/change-password: Error comparing current password:', compareErr);
                return res.status(500).json({ success: false, message: 'An error occurred during current password verification.' });
            }
            if (!isMatch) {
                console.log('/change-password: Invalid current password for user ID:', userId);
                return res.status(401).json({ success: false, message: 'Invalid current password.' });
            }

            bcrypt.hash(newPassword, 10, (hashErr, newHashedPassword) => {
                if (hashErr) {
                    console.error('/change-password: Error hashing new password:', hashErr);
                    return res.status(500).json({ success: false, message: 'An error occurred during new password hashing.' });
                }

                const updateSql = "UPDATE users SET password = ? WHERE id = ?";
                db.query(updateSql, [newHashedPassword, userId], (err, updateResult) => {
                    if (err) {
                        console.error('/change-password: Error updating password in DB:', err);
                        return res.status(500).json({ success: false, message: 'An error occurred while changing password.' });
                    }
                    console.log('/change-password: Password updated in DB for user ID:', userId);

                    const expiresIn = '1h';
                    const newAccessToken = jwt.sign({ id: userId, email: userEmail }, JWT_SECRET, { expiresIn });
                    console.log('/change-password: Generated new token:', newAccessToken.substring(0, 10) + '...');

                    const updateTokenSql = "UPDATE users SET token = ? WHERE id = ?";
                    db.query(updateTokenSql, [newAccessToken, userId], (tokenUpdateErr) => {
                        if (tokenUpdateErr) {
                            console.error('/change-password: Error updating token after password change:', tokenUpdateErr);
                            return res.status(500).json({ success: false, message: 'An error occurred while updating session.' });
                        }
                        console.log('/change-password: Token updated in DB for user ID:', userId);
                        res.json({ success: true, message: 'Password changed successfully!', token: newAccessToken });
                    });
                });
            });
        });
    });
};
