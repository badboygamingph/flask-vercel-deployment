const supabase = require('../db');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
// Removed Vercel Blob import as we're using local file storage

// Removed getImagesDirectory helper function as we're using direct file paths

exports.createAccount = async (req, res) => {
    const { site, username, password } = req.body;
    const userId = req.user.id;

    if (!site || !username || !password) {
        return res.status(400).json({ success: false, message: 'Site, username, and password are required.' });
    }

    let imagePath = 'images/default.png';
    if (req.file) {
        // For Vercel deployments, files are stored in /tmp and need to be moved
        // For local development, files are already in the correct location
        if (process.env.VERCEL) {
            // On Vercel, store the filename only, will move file in getAccounts
            imagePath = `images/${req.file.filename}`;
        } else {
            // For local development, the file is already in the correct directory
            imagePath = `images/${req.file.filename}`;
        }
    } else if (req.body.image === 'images/default.png') {
        imagePath = 'images/default.png';
    }

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
        if (req.file) {
            // Delete the file if there was an error
            let filePath = process.env.VERCEL ? 
                `/tmp/${req.file.filename}` : 
                `C:\\xampp\\htdocs\\fullstack express final backup\\fullstack\\frontend\\images/${req.file.filename}`;
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
            });
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

    // Process accounts to handle image paths correctly
    const accountsWithFullImageUrls = accounts.map(account => {
        if (account.image) {
            // For Vercel deployments, we need to move files from /tmp to images directory
            // But skip this for default images
            if (process.env.VERCEL && account.image.startsWith('images/') && account.image.includes('-') && account.image !== 'images/default.png') {
                // This is a temporary file that needs to be moved
                const filename = account.image.replace('images/', '');
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
                        console.log(`Moved file from ${tmpPath} to ${targetPath}`);
                        
                        // Update the account image path
                        account.image = `images/${filename}`;
                    } catch (moveError) {
                        console.error('Error moving file:', moveError);
                        // If we can't move the file, keep the original path
                    }
                }
            }
            
            // For static images, return relative path
            if (!account.image.startsWith('http')) {
                account.image = account.image.replace(/\\/g, '/');
            }
        }
        return account;
    });

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

    let imagePath = req.body.currentImage;
    if (req.file) {
        // For Vercel deployments, files are stored in /tmp and need to be moved
        // For local development, files are already in the correct location
        if (process.env.VERCEL) {
            // On Vercel, store the filename only, will move file in getAccounts
            imagePath = `images/${req.file.filename}`;
        } else {
            // For local development, the file is already in the correct directory
            imagePath = `images/${req.file.filename}`;
        }
    }

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
        if (req.file) {
            // Delete the file if there was an error
            let filePath = process.env.VERCEL ? 
                `/tmp/${req.file.filename}` : 
                `C:\\xampp\\htdocs\\fullstack express final backup\\fullstack\\frontend\\images/${req.file.filename}`;
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
            });
        }
        return res.status(500).json({ success: false, message: 'Error updating account.' });
    }

    // Check if no rows were affected (account not found or not owned by user)
    if (data && data.length === 0) {
        if (req.file) {
            // Delete the file if account not found
            let filePath = process.env.VERCEL ? 
                `/tmp/${req.file.filename}` : 
                `C:\\xampp\\htdocs\\fullstack express final backup\\fullstack\\frontend\\images/${req.file.filename}`;
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
            });
        }
        return res.status(404).json({ success: false, message: 'Account not found or you do not have permission to update it.' });
    }

    res.json({ success: true, message: 'Account updated successfully!', image: imagePath });
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