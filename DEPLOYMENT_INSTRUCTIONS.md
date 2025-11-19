# Flask Vercel Deployment Instructions

## Prerequisites
1. Vercel account (https://vercel.com)
2. GitHub account with the repository connected to Vercel

## Deployment Steps

### Option 1: Using Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your GitHub repository `badboygamingph/flask-vercel-deployment`
4. Set the project name to `flask-vercel-deployment-amber`
5. Configure the build settings:
   - Build Command: `pip install -r backend/requirements.txt`
   - Output Directory: Leave empty
   - Install Command: Leave empty
6. Add environment variables:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_KEY` - Your Supabase project API key
   - `JWT_SECRET` - Your JWT secret key
   - `BASE_URL` - Your deployed URL (e.g., https://flask-vercel-deployment-amber.vercel.app)
7. Click "Deploy"

### Option 2: Using Vercel CLI
1. Install Vercel CLI: `npm install -g vercel`
2. Navigate to your project directory
3. Run: `vercel --prod`
4. Follow the prompts to deploy to production
5. Make sure to set the environment variables during the deployment process

## Configuration Details
- The Flask app entry point is `backend/flask_app.py`
- Dependencies are in `backend/requirements.txt`
- Vercel configuration is in `vercel.json`
- Serverless wrapper is in `backend/vercel_wrapper.py`

## Custom Domain Setup
To use the URL https://flask-vercel-deployment-amber.vercel.app/:

1. In Vercel Dashboard, go to your project
2. Click "Settings" tab
3. Click "Domains" in the sidebar
4. Add domain: `flask-vercel-deployment-amber.vercel.app`

Note: This domain should be automatically assigned if your project name is `flask-vercel-deployment-amber`.

## Troubleshooting

If you encounter a 500: INTERNAL_SERVER_ERROR after deployment:

1. Check the Vercel function logs for detailed error messages
2. Verify all environment variables are correctly set
3. Ensure the route/controller mappings are consistent (see [SERVERLESS_DEPLOYMENT_FIXES.md](file:///C:/xampp/htdocs/fullstack%20flask%20final%20backup/fullstack/SERVERLESS_DEPLOYMENT_FIXES.md) for details)
4. Confirm the [vercel_wrapper.py](file:///C:/xampp/htdocs/fullstack%20flask%20final%20backup/fullstack/backend/vercel_wrapper.py) file is correctly configured for serverless deployment