const mysql = require('mysql');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "account"
};

const con = mysql.createConnection(dbConfig);

con.connect(function(err) {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log("Connected to database!");

  const createUsersTableSql = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY, 
      firstname VARCHAR(255), 
      middlename VARCHAR(255), 
      lastname VARCHAR(255), 
      email VARCHAR(255) UNIQUE, 
      password VARCHAR(255), 
      profilePicture VARCHAR(255) DEFAULT '/images/default-profile.png',
      token TEXT NULL
    )`;

  con.query(createUsersTableSql, function (err, result) {
    if (err) {
      console.error('Error creating users table:', err);
      return;
    }
    console.log("Users table is ready.");
  });

  const createAccountsTableSql = `
    CREATE TABLE IF NOT EXISTS accounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      site VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      image VARCHAR(255),
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`;

  con.query(createAccountsTableSql, function (err, result) {
    if (err) {
      console.error('Error creating accounts table:', err);
      return;
    }
    console.log("Accounts table is ready.");
  });

  const createOtpsTableSql = `
    CREATE TABLE IF NOT EXISTS otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      otp_code VARCHAR(6) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    )`;

  con.query(createOtpsTableSql, function (err, result) {
    if (err) {
      console.error('Error creating OTPs table:', err);
      return;
    }
    console.log("OTPs table is ready.");
  });
});

module.exports = con;
