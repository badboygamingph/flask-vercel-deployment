import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import logging

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import our modules
from config import Config
from supabase_client import get_supabase_client
from utils.mailer import send_otp_email, send_password_reset_email
from utils.supabase_storage import upload_file_to_supabase, delete_file_from_supabase
from middleware.auth import authenticate_token

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS with specific origins for development and production
CORS(app, 
     origins=[
         "http://127.0.0.1:5500",  # Local development server
         "http://localhost:5500",   # Alternative local development server
         "https://flask-vercel-deployment-amber.vercel.app"  # Production
     ],
     supports_credentials=True,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase client
try:
    supabase = get_supabase_client()
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {str(e)}")
    supabase = None

# Serve static files from the frontend directory
@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/dashboard')
def dashboard():
    return send_from_directory('../frontend', 'dashboard.html')

# Serve all frontend static files
@app.route('/<path:filename>')
def frontend_files(filename):
    try:
        return send_from_directory('../frontend', filename)
    except FileNotFoundError:
        # If file not found, return 404
        return jsonify({'success': False, 'message': 'File not found'}), 404

# Serve images from the frontend/images directory
@app.route('/images/<path:filename>')
def images(filename):
    try:
        return send_from_directory('../frontend/images', filename)
    except FileNotFoundError:
        # If file not found, return 404
        return jsonify({'success': False, 'message': 'Image not found'}), 404

# Import and register blueprints
from routes import auth_bp, user_bp, account_bp, item_bp
app.register_blueprint(auth_bp)
app.register_blueprint(user_bp)
app.register_blueprint(account_bp)
app.register_blueprint(item_bp)

# For Vercel serverless deployment
if __name__ != '__main__':
    app.logger.setLevel(logging.INFO)