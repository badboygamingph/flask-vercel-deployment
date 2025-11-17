const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const transporter = require('../utils/mailer');
const { JWT_SECRET } = require('../config/config');

exports.requestOtp = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const checkEmailSql = "SELECT * FROM users WHERE email = ?";
    db.query(checkEmailSql, [email], async (err, result) => {
        if (err) {
            console.error('Database error during email check:', err);
            return res.status(500).json({ success: false, message: 'An error occurred during email check.' });
        }
        if (result.length > 0) {
            return res.status(409).json({ success: false, message: 'Email already in use. Please try logging in.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + (5 * 60 * 1000));

        const insertOtpSql = `
            INSERT INTO otps (email, otp_code, expires_at)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
            otp_code = VALUES(otp_code), expires_at = VALUES(expires_at), created_at = CURRENT_TIMESTAMP
        `;
        db.query(insertOtpSql, [email, otp, expiresAt], async (dbErr) => {
            if (dbErr) {
                console.error('Error storing OTP in DB:', dbErr);
                return res.status(500).json({ success: false, message: 'An error occurred while storing OTP.' });
            }

            try {
                const emailTemplatePath = path.join(__dirname, '../../frontend', 'templates', 'otp_email.html');
                let emailHtml = fs.readFileSync(emailTemplatePath, 'utf8');
                emailHtml = emailHtml.replace('{{OTP_CODE}}', otp);

                await transporter.sendMail({
                    from: '"Leirad Noznag" <darielganzon2003@gmail.com>',
                    to: email,
                    subject: 'Your OTP for Registration',
                    html: emailHtml,
                    text: `Your One-Time Password (OTP) is: ${otp}. It is valid for 5 minutes. Do not share this with anyone.`,
                });
                res.json({ success: true, message: 'OTP sent successfully to ' + email });
            } catch (error) {
                console.error('Error sending email:', error);
                res.status(500).json({ success: false, message: 'Failed to send OTP. Mailer Error: ' + error.message });
            }
        });
    });
};

exports.requestPasswordResetOtp = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const checkUserSql = `SELECT id FROM users WHERE email = ?`;
    db.query(checkUserSql, [email], async (err, result) => {
        if (err) {
            console.error('Database error during user check for forgot password:', err);
            return res.status(500).json({ success: false, message: 'An error occurred.' });
        }
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'Email not found.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + (5 * 60 * 1000));

        const insertOtpSql = `
            INSERT INTO otps (email, otp_code, expires_at)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
            otp_code = VALUES(otp_code), expires_at = VALUES(expires_at), created_at = CURRENT_TIMESTAMP
        `;
        db.query(insertOtpSql, [email, otp, expiresAt], async (dbErr) => {
            if (dbErr) {
                console.error('Error storing OTP for forgot password in DB:', dbErr);
                return res.status(500).json({ success: false, message: 'An error occurred while storing OTP.' });
            }

            try {
                const emailTemplatePath = path.join(__dirname, '../../frontend', 'templates', 'forgot_password_otp_email.html');
                let emailHtml = fs.readFileSync(emailTemplatePath, 'utf8');
                emailHtml = emailHtml.replace('{{OTP_CODE}}', otp);

                await transporter.sendMail({
                    from: '"Leirad Noznag" <darielganzon2003@gmail.com>',
                    to: email,
                    subject: 'Password Reset OTP',
                    html: emailHtml,
                    text: `Your One-Time Password (OTP) for password reset is: ${otp}. It is valid for 5 minutes. Do not share this with anyone.`,
                });
                res.json({ success: true, message: 'Password reset OTP sent successfully to ' + email });
            } catch (error) {
                console.error('Error sending password reset email:', error);
                res.status(500).json({ success: false, message: 'Failed to send password reset OTP. Mailer Error: ' + error.message });
            }
        });
    });
};

exports.verifyOtpAndRegister = (req, res) => {
    const { firstname, middlename, lastname, email, password, otp } = req.body;

    if (!firstname || !lastname || !email || !password || !otp) {
        return res.status(400).json({ success: false, message: 'All fields including OTP are required.' });
    }

    const getOtpSql = "SELECT otp_code, expires_at FROM otps WHERE email = ?";
    db.query(getOtpSql, [email], (err, otpResult) => {
        if (err) {
            console.error('Error retrieving OTP from DB:', err);
            return res.status(500).json({ success: false, message: 'An error occurred during OTP verification.' });
        }

        if (otpResult.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }

        const storedOtp = otpResult[0];
        const currentTime = new Date();

        if (storedOtp.otp_code !== otp || currentTime > storedOtp.expires_at) {
            const deleteOtpSql = "DELETE FROM otps WHERE email = ?";
            db.query(deleteOtpSql, [email], (deleteErr) => {
                if (deleteErr) console.error('Error deleting expired/invalid OTP:', deleteErr);
            });
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }

        const checkEmailSql = "SELECT * FROM users WHERE email = ?";
        db.query(checkEmailSql, [email], (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).json({ success: false, message: 'An error occurred.' });
                return;
            }
            if (result.length > 0) {
                res.status(409).json({ success: false, message: 'Email already in use.' });
                return;
            }

            bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
                if (hashErr) {
                    console.error(hashErr);
                    res.status(500).json({ success: false, message: 'An error occurred during password hashing.' });
                    return;
                }

                const insertSql = "INSERT INTO users (firstname, middlename, lastname, email, password, profilePicture) VALUES (?, ?, ?, ?, ?, ?)";
                db.query(insertSql, [firstname, middlename, lastname, email, hashedPassword, 'images/default-profile.png'], (err, result) => {
                    if (err) {
                        console.error(err);
                        res.status(500).json({ success: false, message: 'An error occurred.' });
                        return;
                    }
                    const deleteOtpSql = "DELETE FROM otps WHERE email = ?";
                    db.query(deleteOtpSql, [email], (deleteErr) => {
                        if (deleteErr) console.error('Error deleting OTP after successful registration:', deleteErr);
                    });
                    const accessToken = jwt.sign({ id: result.insertId, email: email }, JWT_SECRET, { expiresIn: '1h' });
                    res.json({ success: true, message: 'Registration successful!', token: accessToken });
                });
            });
        });
    });
};

exports.verifyPasswordResetOtp = (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const getOtpSql = `SELECT otp_code, expires_at FROM otps WHERE email = ?`;
    db.query(getOtpSql, [email], (err, otpResult) => {
        if (err) {
            console.error('Error retrieving OTP for password reset from DB:', err);
            return res.status(500).json({ success: false, message: 'An error occurred during OTP verification.' });
        }

        if (otpResult.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }

        const storedOtp = otpResult[0];
        const currentTime = new Date();

        if (storedOtp.otp_code !== otp || currentTime > storedOtp.expires_at) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }

        const deleteOtpSql = "DELETE FROM otps WHERE email = ?";
        db.query(deleteOtpSql, [email], (deleteErr) => {
            if (deleteErr) console.error('Error deleting OTP after successful verification:', deleteErr);
        });

        res.json({ success: true, message: 'OTP verified successfully. You can now reset your password.' });
    });
};

exports.resetPassword = (req, res) => {
    const { email, newPassword, confirmNewPassword } = req.body;

    if (!email || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
    }

    bcrypt.hash(newPassword, 10, (hashErr, hashedPassword) => {
        if (hashErr) {
            console.error(hashErr);
            res.status(500).json({ success: false, message: 'An error occurred during password hashing.' });
            return;
        }

        const updatePasswordSql = "UPDATE users SET password = ? WHERE email = ?";
        db.query(updatePasswordSql, [hashedPassword, email], (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Error updating password:', updateErr);
                return res.status(500).json({ success: false, message: 'An error occurred while resetting password.' });
            }
            if (updateResult.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'User not found.' });
            }
            const clearTokenSql = "UPDATE users SET token = NULL WHERE email = ?";
            db.query(clearTokenSql, [email], (clearTokenErr) => {
                if (clearTokenErr) {
                    console.error('Error clearing token after password reset:', clearTokenErr);
                }
                res.json({ success: true, message: 'Password has been reset successfully! Please log in with your new password.' });
            });
        });
    });
};

exports.login = (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM users WHERE BINARY email = ?";
    db.query(sql, [email], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'An error occurred.' });
        }
        if (result.length > 0) {
            const user = result[0];
            bcrypt.compare(password, user.password, (compareErr, isMatch) => {
                if (compareErr) {
                    console.error(compareErr);
                    return res.status(500).json({ success: false, message: 'An error occurred during password comparison.' });
                }
                if (isMatch) {
                    const expiresIn = '1h';
                    const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn });

                    const updateTokenSql = "UPDATE users SET token = ? WHERE id = ?";
                    db.query(updateTokenSql, [accessToken, user.id], (updateErr) => {
                        if (updateErr) {
                            console.error('Error storing token in DB:', updateErr);
                            return res.status(500).json({ success: false, message: 'An error occurred during login.' });
                        }
                        res.json({
                            success: true,
                            message: 'Login successful!',
                            token: accessToken
                        });
                    });
                } else {
                    res.status(401).json({ success: false, message: 'Invalid credentials!' });
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials!' });
        }
    });
};

exports.logout = (req, res) => {
    const userId = req.user.id;
    const sql = "UPDATE users SET token = NULL WHERE id = ?";
    db.query(sql, [userId], (err) => {
        if (err) {
            console.error('Error clearing token from DB on logout:', err);
            return res.status(500).json({ success: false, message: 'An error occurred during logout.' });
        }
        res.json({ success: true, message: 'Logout successful!' });
    });
};
