import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # Supabase Configuration
    SUPABASE_URL = os.environ.get('SUPABASE_URL') or ''
    SUPABASE_KEY = os.environ.get('SUPABASE_KEY') or ''
    
    # JWT Secret
    JWT_SECRET = os.environ.get('JWT_SECRET') or 'mybearertoken123'
    
    # Base URL
    BASE_URL = os.environ.get('BASE_URL') or 'http://localhost:5000'
    
    # Email Configuration
    EMAIL_HOST = os.environ.get('EMAIL_HOST') or 'smtp.gmail.com'
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT') or 587)
    EMAIL_USER = os.environ.get('EMAIL_USER') or 'your_email@gmail.com'
    EMAIL_PASS = os.environ.get('EMAIL_PASS') or 'your_app_password'
    
    # Debug mode
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'