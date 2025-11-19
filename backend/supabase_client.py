import os
import logging
from supabase import create_client, Client
from config import Config

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance.
    """
    supabase_url = Config.SUPABASE_URL
    supabase_key = Config.SUPABASE_KEY
    
    logger.info("Initializing Supabase client")
    logger.info(f"Supabase URL: {supabase_url}")
    logger.info(f"Supabase Key exists: {bool(supabase_key)}")
    
    # Check if Supabase credentials are available
    if not supabase_url or not supabase_key:
        logger.warning("Supabase credentials not found in environment variables")
        logger.warning("Make sure to set SUPABASE_URL and SUPABASE_KEY in your environment variables")
        return None
    
    try:
        logger.info("Creating Supabase client with URL and Key")
        supabase: Client = create_client(supabase_url, supabase_key)
        logger.info("Supabase client created successfully")
        return supabase
    except Exception as error:
        logger.error(f"Error creating Supabase client: {str(error)}")
        # Return None to prevent crashing the application
        return None

# Create a global instance
try:
    supabase = get_supabase_client()
except Exception as e:
    logger.error(f"Failed to create Supabase client instance: {str(e)}")
    supabase = None