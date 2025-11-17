require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('Creating Supabase tables...');
  
  try {
    // Create users table
    const { data: usersTable, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (usersError && usersError.message.includes('relation "users" does not exist')) {
      console.log('Users table does not exist. Please create it manually in Supabase dashboard:');
      console.log('- Table name: users');
      console.log('- Columns: id (int8, primary key), firstname (text), middlename (text), lastname (text), email (text, unique), password (text), profilePicture (text), token (text)');
    } else if (usersError) {
      console.log('Users table check error:', usersError.message);
    } else {
      console.log('Users table already exists.');
    }
    
    // Create accounts table
    const { data: accountsTable, error: accountsError } = await supabase
      .from('accounts')
      .select('id')
      .limit(1);
      
    if (accountsError && accountsError.message.includes('relation "accounts" does not exist')) {
      console.log('Accounts table does not exist. Please create it manually in Supabase dashboard:');
      console.log('- Table name: accounts');
      console.log('- Columns: id (int8, primary key), site (text), username (text), password (text), image (text), user_id (int8, foreign key to users.id)');
    } else if (accountsError) {
      console.log('Accounts table check error:', accountsError.message);
    } else {
      console.log('Accounts table already exists.');
    }
    
    // Create otps table
    const { data: otpsTable, error: otpsError } = await supabase
      .from('otps')
      .select('id')
      .limit(1);
      
    if (otpsError && otpsError.message.includes('relation "otps" does not exist')) {
      console.log('OTPs table does not exist. Please create it manually in Supabase dashboard:');
      console.log('- Table name: otps');
      console.log('- Columns: id (int8, primary key), email (text, unique), otp_code (text), created_at (timestamp), expires_at (timestamp)');
    } else if (otpsError) {
      console.log('OTPs table check error:', otpsError.message);
    } else {
      console.log('OTPs table already exists.');
    }
    
    console.log('\nTo create these tables:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to "Table Editor"');
    console.log('3. Click "New Table" and create each table with the specifications above');
    console.log('4. Set up the foreign key relationship from accounts.user_id to users.id');
    
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

createTables();