require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'Key loaded' : 'Key not loaded');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test the connection by trying to get the users table structure
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error connecting to Supabase:', error.message);
      return false;
    }

    console.log('Successfully connected to Supabase!');
    console.log('Users table exists and is accessible.');
    return true;
  } catch (err) {
    console.error('Unexpected error:', err.message);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('Supabase setup is correct!');
  } else {
    console.log('Please check your Supabase credentials and table setup.');
  }
});