require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize tables
async function initializeTables() {
  try {
    console.log("Connected to Supabase!");
    
    // Users table is created automatically in Supabase Auth
    
    // Create accounts table if it doesn't exist
    // Note: In Supabase, tables are typically created through the dashboard
    // This is just for reference on the table structure
    console.log("Accounts table should be created in Supabase dashboard with the following structure:");
    console.log("- id (int8, primary key, auto increment)");
    console.log("- site (text)");
    console.log("- username (text)");
    console.log("- password (text)");
    console.log("- image (text)");
    console.log("- user_id (uuid, foreign key to auth.users.id)");
    
    // Create otps table if it doesn't exist
    console.log("OTPs table should be created in Supabase dashboard with the following structure:");
    console.log("- id (int8, primary key, auto increment)");
    console.log("- email (text)");
    console.log("- otp_code (text)");
    console.log("- created_at (timestamp, default now())");
    console.log("- expires_at (timestamp)");
    
  } catch (error) {
    console.error('Error initializing Supabase tables:', error);
  }
}

// Export initializeTables function for manual calling if needed
module.exports = { supabase, initializeTables };