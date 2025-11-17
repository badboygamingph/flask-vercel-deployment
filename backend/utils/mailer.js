const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'darielganzon2003@gmail.com',
        pass: 'azfs mmtr jhxh tsyu'
    },
    tls: {
        ciphers:'SSLv3',
        rejectUnauthorized: false
    }
});

module.exports = transporter;
