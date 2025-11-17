const supabase = require('../db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, BASE_URL } = require('../config/config');
const { uploadFileToSupabase, deleteFileFromSupabase } = require('../utils/supabaseStorage');

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
        // Ensure profilePicture has a default value if null
        if (!user.profilePicture) {
            user.profilePicture = 'images/default-profile.png';
        }
        
        // For Supabase Storage URLs, return as-is since they're already full URLs
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

    // First, get the current user data to retrieve the existing profile picture URL
    const { data: currentUserData, error: fetchError } = await supabase
        .from('users')
        .select('profilePicture')
        .eq('id', userId);

    if (fetchError) {
        console.error(fetchError);
        return res.status(500).json({ success: false, message: 'Error fetching current user data.' });
    }

    // Check if user exists
    if (!currentUserData || currentUserData.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const currentProfilePicture = currentUserData[0].profilePicture;
    let profilepicturePath = 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default-profile.png';
    
    // Upload file to Supabase Storage
    try {
        // Read the file buffer directly from the uploaded file
        const fileBuffer = req.file.buffer || fs.readFileSync(req.file.path);
        const fileName = `profile-pictures/${req.file.filename}`;
        
        const { publicUrl, error } = await uploadFileToSupabase(fileBuffer, fileName, 'images'); // Use 'images' bucket
        
        if (error) {
            console.error('Error uploading profile picture to Supabase Storage:', error);
            // Provide a more informative error message
            return res.status(500).json({ 
                success: false, 
                message: error.message || 'Failed to upload profile picture to Supabase Storage. Please try again or contact support.'
            });
        } else {
            profilepicturePath = publicUrl;
            
            // If there was a previous profile picture stored in Supabase Storage, delete it
            if (currentProfilePicture && currentProfilePicture.startsWith('http') && currentProfilePicture.includes('supabase.co/storage')) {
                try {
                    // Extract the file name from the URL
                    const urlParts = currentProfilePicture.split('/');
                    const oldFileName = urlParts[urlParts.length - 1];
                    const oldFilePath = `profile-pictures/${oldFileName}`;
                    console.log(`Deleting old profile picture file: ${oldFilePath}`);
                    const { error: deleteError } = await deleteFileFromSupabase(oldFilePath, 'images');
                    
                    if (deleteError) {
                        console.error('Error deleting old profile picture from Supabase Storage:', deleteError);
                    } else {
                        console.log('Old profile picture deleted successfully from Supabase Storage');
                    }
                } catch (deleteErr) {
                    console.error('Error deleting old profile picture file:', deleteErr);
                }
            }
        }
        
        // Clean up local file if it exists
        try {
            if (req.file.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        } catch (cleanupError) {
            console.error('Error cleaning up local file:', cleanupError);
        }
    } catch (fileReadError) {
        console.error('Error reading file for Supabase upload:', fileReadError);
        profilepicturePath = 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default-profile.png';
    }

    const { data, error } = await supabase
        .from('users')
        .update({ profilePicture: profilepicturePath })
        .eq('id', userId);

    if (error) {
        console.error('Error updating profile picture in DB:', error);
        // If there was an error, try to delete the uploaded file from Supabase
        if (profilepicturePath.startsWith('http')) {
            const urlParts = profilepicturePath.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const filePath = `profile-pictures/${fileName}`;
            await deleteFileFromSupabase(filePath, 'images'); // Use 'images' bucket
        }
        return res.status(500).json({ success: false, message: 'Error saving profile picture.' });
    }

    // Check if no rows were affected (user not found or not owned by user)
    if (data && data.length === 0) {
        // If there was an error, try to delete the uploaded file from Supabase
        if (profilepicturePath.startsWith('http')) {
            const urlParts = profilepicturePath.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const filePath = `profile-pictures/${fileName}`;
            await deleteFileFromSupabase(filePath, 'images'); // Use 'images' bucket
        }
        return res.status(404).json({ success: false, message: 'User not found or you do not have permission to update profile picture.' });
    }

    res.json({ success: true, message: 'Profile picture updated successfully!', profilepicture: profilepicturePath });
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
        
        // Ensure profilePicture has a default value if null
        if (!profilepicture) {
            profilepicture = 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default-profile.png';
        }
        
        // For Supabase Storage URLs, return as-is since they're already full URLs
        // For local images, return relative path
        if (profilepicture && !profilepicture.startsWith('http')) {
            // Ensure the path is properly formatted
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