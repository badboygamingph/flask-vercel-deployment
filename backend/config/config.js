require('dotenv').config();

module.exports = {
    JWT_SECRET: process.env.JWT_SECRET || 'mybearertoken123',
    BASE_URL: process.env.BASE_URL || 'http://localhost:5000'
};
