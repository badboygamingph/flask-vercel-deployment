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

    let imagePath = 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default.png';
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
                return res.status(500).json({ 
                    success: false, 
                    message: error.message || 'Failed to upload image to Supabase Storage. Please try again or contact support.'
                });
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
            imagePath = 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default.png';
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
            await deleteFileFromSupabase(fileName, 'images');
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
            account.image = 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default.png';
        }
        
        // For Supabase Storage URLs, return as-is since they're already full URLs
        // For local images or default images, return relative path
        if (!account.image.startsWith('http') && account.image !== 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default.png') {
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

    // First, get the current account data to retrieve the existing image URL
    const { data: currentAccountData, error: fetchError } = await supabase
        .from('accounts')
        .select('image')
        .eq('id', accountId)
        .eq('user_id', userId);

    if (fetchError) {
        console.error(fetchError);
        return res.status(500).json({ success: false, message: 'Error fetching current account data.' });
    }

    // Check if account exists
    if (!currentAccountData || currentAccountData.length === 0) {
        return res.status(404).json({ success: false, message: 'Account not found or you do not have permission to update it.' });
    }

    const currentImage = currentAccountData[0].image;
    let imagePath = currentImage || 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default.png';
    
    if (req.file) {
        // Upload new file to Supabase Storage
        try {
            // Read the file buffer directly from the uploaded file
            const fileBuffer = req.file.buffer || fs.readFileSync(req.file.path);
            const fileName = `accounts/${req.file.filename}`;
            
            const { publicUrl, error } = await uploadFileToSupabase(fileBuffer, fileName);
            
            if (error) {
                console.error('Error uploading file to Supabase Storage:', error);
                // Provide a more informative error message
                return res.status(500).json({ 
                    success: false, 
                    message: error.message || 'Failed to upload image to Supabase Storage. Please try again or contact support.'
                });
            } else {
                imagePath = publicUrl;
                
                // If there was a previous image stored in Supabase Storage, delete it
                if (currentImage && currentImage.startsWith('http') && currentImage.includes('supabase.co/storage')) {
                    try {
                        // Extract the file name from the URL
                        const urlParts = currentImage.split('/');
                        const oldFileName = urlParts[urlParts.length - 1];
                        const oldFilePath = `accounts/${oldFileName}`;
                        console.log(`Deleting old image file: ${oldFilePath}`);
                        const { error: deleteError } = await deleteFileFromSupabase(oldFilePath, 'images');
                        
                        if (deleteError) {
                            console.error('Error deleting old image from Supabase Storage:', deleteError);
                        } else {
                            console.log('Old image deleted successfully from Supabase Storage');
                        }
                    } catch (deleteErr) {
                        console.error('Error deleting old image file:', deleteErr);
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
        }
    } else if (req.body.image === 'images/default.png') {
        // If user explicitly selected default image, use it
        imagePath = 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default.png';
        
        // If there was a previous image stored in Supabase Storage, delete it
        if (currentImage && currentImage.startsWith('http') && currentImage.includes('supabase.co/storage')) {
            try {
                // Extract the file name from the URL
                const urlParts = currentImage.split('/');
                const oldFileName = urlParts[urlParts.length - 1];
                const oldFilePath = `accounts/${oldFileName}`;
                console.log(`Deleting old image file: ${oldFilePath}`);
                const { error: deleteError } = await deleteFileFromSupabase(oldFilePath, 'images');
                
                if (deleteError) {
                    console.error('Error deleting old image from Supabase Storage:', deleteError);
                } else {
                    console.log('Old image deleted successfully from Supabase Storage');
                }
            } catch (deleteErr) {
                console.error('Error deleting old image file:', deleteErr);
            }
        }
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
            await deleteFileFromSupabase(filePath, 'images');
        }
        return res.status(404).json({ success: false, message: 'Account not found or you do not have permission to update it.' });
    }

    res.json({ success: true, message: 'Account updated successfully!' });
};

exports.deleteAccount = async (req, res) => {
    const accountId = req.params.id;
    const userId = req.user.id;

    // First, get the account to retrieve the image URL
    const { data: accountData, error: fetchError } = await supabase
        .from('accounts')
        .select('image')
        .eq('id', accountId)
        .eq('user_id', userId);

    if (fetchError) {
        console.error(fetchError);
        return res.status(500).json({ success: false, message: 'Error fetching account for deletion.' });
    }

    // Check if account exists
    if (!accountData || accountData.length === 0) {
        return res.status(404).json({ success: false, message: 'Account not found or you do not have permission to delete it.' });
    }

    const accountImage = accountData[0].image;

    // Delete the account
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

    // If the account had an image stored in Supabase Storage, delete it
    if (accountImage && accountImage.startsWith('http') && accountImage.includes('supabase.co/storage')) {
        try {
            // Extract the file name from the URL
            const urlParts = accountImage.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const filePath = `accounts/${fileName}`;
            
            console.log(`Deleting image file: ${filePath}`);
            const { error: deleteError } = await deleteFileFromSupabase(filePath, 'images');
            
            if (deleteError) {
                console.error('Error deleting image from Supabase Storage:', deleteError);
            } else {
                console.log('Image deleted successfully from Supabase Storage');
            }
        } catch (deleteErr) {
            console.error('Error deleting image file:', deleteErr);
        }
    }

    res.json({ success: true, message: 'Account deleted successfully!' });
};