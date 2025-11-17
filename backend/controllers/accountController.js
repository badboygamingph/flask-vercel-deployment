const supabase = require('../db');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { uploadFileToSupabase, deleteFileFromSupabase } = require('../utils/supabaseStorage');

exports.createAccount = async (req, res) => {
    const { site, username, password } = req.body;
    const userId = req.user.id;

    if (!site || !username || !password) {
        return res.status(400).json({ success: false, message: 'Site, username, and password are required.' });
    }

    let imagePath = 'images/default.png';
    // Check if a file was uploaded
    if (req.file) {
        // Upload file to Supabase Storage
        try {
            // Read the file buffer directly from the uploaded file
            const fileBuffer = req.file.buffer || fs.readFileSync(req.file.path);
            const fileName = `accounts/${req.file.filename}`;
            
            const { publicUrl, error } = await uploadFileToSupabase(fileBuffer, fileName);
            
            if (error) {
                console.error('Error uploading file to Supabase Storage:', error);
                // Provide a more informative error message
                if (error.message && (error.message.includes('new row violates row-level security policy') || error.message.includes('Bucket not found') || error.message.includes('bucket in your Supabase Storage dashboard'))) {
                    return res.status(500).json({ 
                        success: false, 
                        message: error.message
                    });
                }
                // Fall back to default image if upload fails
                imagePath = 'images/default.png';
            } else {
                imagePath = publicUrl;
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
            imagePath = 'images/default.png';
        }
    } 
    // If no file was uploaded, use the default image path that was sent from frontend
    // This handles the case where req.body.image === 'images/default.png'

    // Log the image path for debugging
    console.log('/accounts: Image path being stored:', imagePath);

    const { data, error } = await supabase
        .from('accounts')
        .insert([
            {
                site: site,
                username: username,
                password: password,
                image: imagePath,
                user_id: userId
            }
        ])
        .select();

    if (error) {
        console.error(error);
        // If there was an error and we uploaded a file, try to delete it from Supabase
        if (req.file && imagePath.startsWith('http')) {
            const fileName = `accounts/${req.file.filename}`;
            await deleteFileFromSupabase(fileName);
        }
        return res.status(500).json({ success: false, message: 'Error creating account.' });
    }

    res.json({ success: true, message: 'Account created successfully!', accountId: data[0].id });
};

exports.getAccounts = async (req, res) => {
    console.log('/accounts: Request received for user ID:', req.user.id);
    const userId = req.user.id;

    const { data: accounts, error } = await supabase
        .from('accounts')
        .select('id, site, username, password, image')
        .eq('user_id', userId);

    if (error) {
        console.error('/accounts: DB Error reading accounts:', error);
        return res.status(500).json({ success: false, message: 'Error reading accounts.' });
    }

    // Log the raw accounts data for debugging
    console.log('/accounts: Raw accounts data:', JSON.stringify(accounts, null, 2));

    // Process accounts to handle image paths correctly
    const accountsWithFullImageUrls = accounts.map(account => {
        // Ensure image field has a default value if null
        if (!account.image) {
            account.image = 'images/default.png';
        }
        
        // For Supabase Storage URLs, return as-is since they're already full URLs
        // For local images or default images, return relative path
        if (!account.image.startsWith('http') && account.image !== 'images/default.png') {
            account.image = account.image.replace(/\\/g, '/');
        }
        
        return account;
    });

    // Log the processed accounts data for debugging
    console.log('/accounts: Processed accounts data:', JSON.stringify(accountsWithFullImageUrls, null, 2));

    console.log('/accounts: Successfully retrieved accounts for user ID:', userId, 'Count:', accounts.length);
    res.json({ success: true, message: 'Accounts retrieved successfully!', accounts: accountsWithFullImageUrls });
};

exports.updateAccount = async (req, res) => {
    const accountId = req.params.id;
    const { site, username, password } = req.body;
    const userId = req.user.id;

    if (!site || !username || !password) {
        return res.status(400).json({ success: false, message: 'Site, username, and password are required.' });
    }

    let imagePath = req.body.currentImage || 'images/default.png';
    if (req.file) {
        // Upload new file to Supabase Storage
        try {
            // Read the file buffer directly from the uploaded file
            const fileBuffer = req.file.buffer || fs.readFileSync(req.file.path);
            const fileName = `accounts/${req.file.filename}`;
            
            // If there was a previous image, try to delete it from Supabase Storage
            if (imagePath && imagePath.startsWith('http')) {
                // Extract the file name from the URL
                const urlParts = imagePath.split('/');
                const oldFileName = urlParts[urlParts.length - 1];
                const oldFilePath = `accounts/${oldFileName}`;
                await deleteFileFromSupabase(oldFilePath);
            }
            
            const { publicUrl, error } = await uploadFileToSupabase(fileBuffer, fileName);
            
            if (error) {
                console.error('Error uploading file to Supabase Storage:', error);
                // Provide a more informative error message
                if (error.message && (error.message.includes('new row violates row-level security policy') || error.message.includes('Bucket not found'))) {
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Storage bucket not configured properly. Please check Supabase Storage setup instructions in README_SUPABASE_SETUP.txt' 
                    });
                }
                // Keep the current image if upload fails
            } else {
                imagePath = publicUrl;
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
        }
    } else if (req.body.image === 'images/default.png') {
        // If user explicitly selected default image, use it
        imagePath = 'images/default.png';
    }

    // Log the image path for debugging
    console.log('/accounts/:id: Image path being updated:', imagePath);

    const { data, error } = await supabase
        .from('accounts')
        .update({
            site: site,
            username: username,
            password: password,
            image: imagePath
        })
        .eq('id', accountId)
        .eq('user_id', userId);

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Error updating account.' });
    }

    // Check if no rows were affected (account not found or not owned by user)
    if (data && data.length === 0) {
        // If we uploaded a new file but the update failed, try to delete the uploaded file
        if (req.file && imagePath && imagePath.startsWith('http')) {
            const urlParts = imagePath.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const filePath = `accounts/${fileName}`;
            await deleteFileFromSupabase(filePath);
        }
        return res.status(404).json({ success: false, message: 'Account not found or you do not have permission to update it.' });
    }

    res.json({ success: true, message: 'Account updated successfully!' });
};

exports.deleteAccount = async (req, res) => {
    const accountId = req.params.id;
    const userId = req.user.id;

    const { data, error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', userId);

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Error deleting account.' });
    }

    // Check if no rows were affected (account not found or not owned by user)
    if (data && data.length === 0) {
        return res.status(404).json({ success: false, message: 'Account not found or you do not have permission to delete it.' });
    }

    res.json({ success: true, message: 'Account deleted successfully!' });
};