const supabase = require('../db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, BASE_URL } = require('../config/config');
// Removed Vercel Blob import as we're using local file storage

// Removed getImagesDirectory helper function as we're using direct file paths

exports.getUserInfo = async (req, res) => {
    const userId = req.user.id;

    const { data: users, error } = await supabase
        .from('users')
        .select('id, firstname, middlename, lastname, email, profilePicture')
        .eq('id', userId);

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'An error occurred.' });
    }

    if (users.length > 0) {
        const user = users[0];
        // For Vercel Blob URLs, return as-is since they're already full URLs
        // For local images, return relative path
        if (user.profilePicture && !user.profilePicture.startsWith('http')) {
            user.profilePicture = user.profilePicture.replace(/\\/g, '/');
        }
        res.json({ success: true, user: user });
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
};

exports.updateUserInfo = async (req, res) => {
    const userId = req.params.id;
    const { firstname, middlename, lastname, email } = req.body;

    if (req.user.id != userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized to update this user.' });
    }

    if (!firstname || !lastname || !email) {
        return res.status(400).json({ success: false, message: 'First name, last name, and email are required.' });
    }

    const { data, error } = await supabase
        .from('users')
        .update({ firstname, middlename, lastname, email })
        .eq('id', userId);

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Error updating user information.' });
    }

    if (data === null) {
        return res.status(404).json({ success: false, message: 'User not found or no changes made.' });
    }

    res.json({ success: true, message: 'Account information updated successfully!' });
};

exports.uploadProfilePicture = async (req, res) => {
    const userId = req.user.id;
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // For Vercel deployments, files are stored in /tmp and need to be moved
    // For local development, files are already in the correct location
    const profilepicturePath = `/images/${req.file.filename}`;

    const { data, error } = await supabase
        .from('users')
        .update({ profilePicture: profilepicturePath })
        .eq('id', userId);

    if (error) {
        console.error('Error updating profile picture in DB:', error);
        // Delete the file if there was an error
        let filePath = process.env.VERCEL ? 
            `/tmp/${req.file.filename}` : 
            `C:\\xampp\\htdocs\\fullstack express final backup\\fullstack\\frontend\\images/${req.file.filename}`;
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
        });
        return res.status(500).json({ success: false, message: 'Error saving profile picture.' });
    }

    // Check if no rows were affected (user not found or not owned by user)
    if (data && data.length === 0) {
        // Delete the file if user not found
        let filePath = process.env.VERCEL ? 
            `/tmp/${req.file.filename}` : 
            `C:\\xampp\\htdocs\\fullstack express final backup\\fullstack\\frontend\\images/${req.file.filename}`;
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
        });
        return res.status(404).json({ success: false, message: 'User not found or you do not have permission to update profile picture.' });
    }

    // For local images, construct full URL
    const fullProfilePicturePath = `${BASE_URL}${profilepicturePath.replace(/\\/g, '/')}`;
    res.json({ success: true, message: 'Profile picture updated successfully!', profilepicture: fullProfilePicturePath });
};

exports.getProfilePicture = async (req, res) => {
    const userId = req.user.id;

    const { data: users, error } = await supabase
        .from('users')
        .select('profilePicture')
        .eq('id', userId);

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'An error occurred.' });
    }

    if (users.length > 0) {
        let profilepicture = users[0].profilePicture;
        
        // For Vercel deployments, we need to move files from /tmp to images directory
        // But skip this for default images
        if (process.env.VERCEL && profilepicture && profilepicture.startsWith('images/') && profilepicture.includes('-') && profilepicture !== 'images/default-profile.png') {
            // This is a temporary file that needs to be moved
            const filename = profilepicture.replace('images/', '');
            const tmpPath = `/tmp/${filename}`;
            // targetPath will be set later with proper path resolution
            
            // Check if the file exists in /tmp and move it
            if (fs.existsSync(tmpPath)) {
                try {
                    // Ensure the target directory exists
                    const targetDir = './frontend/images';
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }
                    
                    // Move the file from /tmp to images directory
                    const targetPath = path.join(__dirname, '../../frontend/images', filename);
                    fs.renameSync(tmpPath, targetPath);
                    console.log(`Moved profile picture from ${tmpPath} to ${targetPath}`);
                    
                    // Update the user profile picture path in database
                    profilepicture = `images/${filename}`;
                    
                    // Update the database with the new path
                    await supabase
                        .from('users')
                        .update({ profilePicture: profilepicture })
                        .eq('id', userId);
                } catch (moveError) {
                    console.error('Error moving profile picture:', moveError);
                    // If we can't move the file, keep the original path
                }
            }
        }
        
        // For static images, return relative path
        if (profilepicture && !profilepicture.startsWith('http')) {
            profilepicture = profilepicture.replace(/\\/g, '/');
        }
        res.json({ success: true, profilepicture: profilepicture });
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
};

exports.verifyCurrentPassword = async (req, res) => {
    const { currentPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required.' });
    }

    const { data: users, error } = await supabase
        .from('users')
        .select('password')
        .eq('id', userId);

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'An error occurred.' });
    }

    if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const hashedPassword = users[0].password;
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
};

exports.changePassword = async (req, res) => {
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

    const { data: users, error: checkError } = await supabase
        .from('users')
        .select('password')
        .eq('id', userId);

    if (checkError) {
        console.error('/change-password: Error verifying current password from DB:', checkError);
        return res.status(500).json({ success: false, message: 'An error occurred while verifying current password.' });
    }

    if (users.length === 0) {
        console.log('/change-password: User not found for ID:', userId);
        return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const hashedPassword = users[0].password;
    bcrypt.compare(currentPassword, hashedPassword, async (compareErr, isMatch) => {
        if (compareErr) {
            console.error('/change-password: Error comparing current password:', compareErr);
            return res.status(500).json({ success: false, message: 'An error occurred during current password verification.' });
        }
        if (!isMatch) {
            console.log('/change-password: Invalid current password for user ID:', userId);
            return res.status(401).json({ success: false, message: 'Invalid current password.' });
        }

        bcrypt.hash(newPassword, 10, async (hashErr, newHashedPassword) => {
            if (hashErr) {
                console.error('/change-password: Error hashing new password:', hashErr);
                return res.status(500).json({ success: false, message: 'An error occurred during new password hashing.' });
            }

            const { data, error: updateError } = await supabase
                .from('users')
                .update({ password: newHashedPassword })
                .eq('id', userId);

            if (updateError) {
                console.error('/change-password: Error updating password in DB:', updateError);
                return res.status(500).json({ success: false, message: 'An error occurred while changing password.' });
            }

            console.log('/change-password: Password updated in DB for user ID:', userId);

            const expiresIn = '1h';
            const newAccessToken = jwt.sign({ id: userId, email: userEmail }, JWT_SECRET, { expiresIn });
            console.log('/change-password: Generated new token:', newAccessToken.substring(0, 10) + '...');

            const { error: tokenUpdateError } = await supabase
                .from('users')
                .update({ token: newAccessToken })
                .eq('id', userId);

            if (tokenUpdateError) {
                console.error('/change-password: Error updating token after password change:', tokenUpdateError);
                return res.status(500).json({ success: false, message: 'An error occurred while updating session.' });
            }

            console.log('/change-password: Token updated in DB for user ID:', userId);
            res.json({ success: true, message: 'Password changed successfully!', token: newAccessToken });
        });
    });
};