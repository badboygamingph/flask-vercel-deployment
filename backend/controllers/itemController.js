const db = require('../db');

exports.createItem = (req, res) => {
    const { name, description } = req.body;
    const userId = req.user.id;
    const sql = "INSERT INTO items (name, description, user_id) VALUES (?, ?, ?)";
    db.query(sql, [name, description, userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error creating item.' });
        }
        res.json({ success: true, message: 'Item created successfully!', itemId: result.insertId });
    });
};

exports.readItems = (req, res) => {
    const userId = req.user.id;
    const sql = "SELECT * FROM items WHERE user_id = ?";
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error reading items.' });
        }
        res.json({ success: true, message: 'Items retrieved successfully!', items: results });
    });
};

exports.updateItem = (req, res) => {
    const { id, name, description } = req.body;
    const userId = req.user.id;
    const sql = "UPDATE items SET name = ?, description = ? WHERE id = ? AND user_id = ?";
    db.query(sql, [name, description, id, userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error updating item.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Item not found or you do not have permission to update it.' });
        }
        res.json({ success: true, message: 'Item updated successfully!' });
    });
};

exports.deleteItem = (req, res) => {
    const { id } = req.body;
    const userId = req.user.id;
    const sql = "DELETE FROM items WHERE id = ? AND user_id = ?";
    db.query(sql, [id, userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error deleting item.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Item not found or you do not have permission to delete it.' });
        }
        res.json({ success: true, message: 'Item deleted successfully!' });
    });
};
