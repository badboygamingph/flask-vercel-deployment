const express = require('express');
const app = express();
const port = 5000;
const db = require('./db');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const itemRoutes = require('./routes/itemRoutes');
const accountRoutes = require('./routes/accountRoutes');

app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/images', express.static(path.join(__dirname, '../frontend/images')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'dashboard.html'));
});

app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', itemRoutes);
app.use('/', accountRoutes);

// Export the app for Vercel
module.exports = app;

// Only start the server if this file is run directly
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`);
    });
}
