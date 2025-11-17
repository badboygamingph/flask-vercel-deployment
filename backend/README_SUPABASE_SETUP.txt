Supabase Setup Instructions
=========================

1. Get Your Supabase Credentials:
   - Go to https://app.supabase.io/
   - Select your project
   - Go to "Project Settings" → "API"
   - Copy your "Project URL" and "anon" key

2. Update Your Environment Variables:
   - For local development:
     * Open the `.env` file in this directory
     * Replace `your_supabase_project_url` with your actual Project URL
     * Replace `your_supabase_anon_key` with your actual anon key
   - For Vercel deployment:
     * Go to your Vercel dashboard
     * Select your project
     * Go to "Settings" → "Environment Variables"
     * Add the following environment variables:
       - SUPABASE_URL: Your Supabase project URL
       - SUPABASE_KEY: Your Supabase anon key
       - EMAIL_USER: Your email address
       - EMAIL_PASS: Your email app password
       - JWT_SECRET: A strong secret for JWT tokens

3. Create Database Tables:
   - In the Supabase dashboard, go to "SQL Editor" in the left sidebar
   - Copy the entire content of `sql/supabase_tables.sql` and paste it into the SQL Editor
   - Click "RUN" to execute the script
   - This will create all three tables (users, accounts, otps) with proper relationships

4. Set Up Supabase Storage:
   - Manually create the bucket in the Supabase dashboard:
     * Go to "Storage" in the left sidebar
     * Click "New bucket"
     * Name it "images"
     * Set it to "Public"
     * Click "Create"
   - Create folders in the bucket:
     * Click on the "images" bucket
     * Click "Create folder"
     * Create a folder named "accounts"
     * Create another folder named "profile-pictures"
   - Set up row-level security policies:
     * Go to "SQL Editor" in the left sidebar
     * Run the following SQL commands:
       ```sql
       -- Allow public read access to images bucket
       INSERT INTO storage.buckets (id, name, public) 
       VALUES ('images', 'images', true) 
       ON CONFLICT (id) DO UPDATE SET public = true;
       
       -- Allow authenticated users to upload and delete files
       CREATE POLICY "Allow authenticated uploads" 
       ON storage.objects FOR INSERT 
       TO authenticated 
       WITH CHECK (bucket_id = 'images');
       
       CREATE POLICY "Allow authenticated deletes" 
       ON storage.objects FOR DELETE 
       TO authenticated 
       USING (bucket_id = 'images');
       
       CREATE POLICY "Allow public reads" 
       ON storage.objects FOR SELECT 
       TO public 
       USING (bucket_id = 'images');
       ```

5. Redeploy Your Application:
   - After setting environment variables in Vercel, you need to redeploy your application
   - Go to your Vercel dashboard
   - Select your project
   - Go to "Deployments"
   - Click "Redeploy" or push a new commit to trigger a new deployment

6. Test Your Setup:
   - Run `npm start` in this directory for local testing
   - The application should connect to your Supabase database

Example .env configuration:
SUPABASE_URL=https://nttadnyxpbuwuhgtpvjh.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dGFkbnl4cGJ1d3VoZ3RwdmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMjU4NTIsImV4cCI6MjA3ODkwMTg1Mn0.W666WUJcpgsHRAU-sXNFTmfQzkOuLijFWUfCQT1-rys
JWT_SECRET=mybearertoken123
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=darielganzon2003@gmail.com
EMAIL_PASS="azfs mmtr jhxh tsyu"