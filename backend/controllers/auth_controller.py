import hashlib
import uuid
import re
import logging
import jwt
from flask import jsonify, request, session
from supabase_client import supabase
from config import Config
from utils.mailer import send_otp_email, send_password_reset_email

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def hash_password(password):
    salt = uuid.uuid4().hex
    return hashlib.sha256((password + salt).encode()).hexdigest(), salt

def verify_password(hashed_password, salt, password):
    return hashed_password == hashlib.sha256((password + salt).encode()).hexdigest()

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def signup():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirmPassword')
        name = data.get('name')

        # Validation
        if not email or not password or not confirm_password or not name:
            return jsonify({'success': False, 'message': 'All fields are required'}), 400

        if not validate_email(email):
            return jsonify({'success': False, 'message': 'Invalid email format'}), 400

        if password != confirm_password:
            return jsonify({'success': False, 'message': 'Passwords do not match'}), 400

        if len(password) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400

        # Check if Supabase client is initialized
        if supabase is None:
            logger.error("Supabase client is not initialized")
            return jsonify({'success': False, 'message': 'Database connection error'}), 500

        # Check if user already exists
        existing_user = supabase.table('users').select('*').eq('email', email).execute()
        if existing_user.data:
            return jsonify({'success': False, 'message': 'Email already registered'}), 400

        # Hash password
        hashed_password, salt = hash_password(password)

        # Create user
        user_data = {
            'email': email,
            'password_hash': hashed_password,
            'salt': salt,
            'name': name
        }
        
        result = supabase.table('users').insert(user_data).execute()
        
        if result.data:
            return jsonify({'success': True, 'message': 'Account created successfully'}), 201
        else:
            return jsonify({'success': False, 'message': 'Failed to create account'}), 500
            
    except Exception as e:
        logger.error(f'Signup error: {str(e)}')
        return jsonify({'success': False, 'message': 'An error occurred during signup'}), 500

def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        # Validation
        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password are required'}), 400

        # Check if Supabase client is initialized
        if supabase is None:
            logger.error("Supabase client is not initialized")
            return jsonify({'success': False, 'message': 'Database connection error'}), 500

        # Get user
        result = supabase.table('users').select('*').eq('email', email).execute()
        users = result.data
        
        if not users:
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

        user = users[0]
        hashed_password = user['password_hash']
        salt = user['salt']

        # Verify password
        if not verify_password(hashed_password, salt, password):
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

        # Generate JWT token
        token_payload = {
            'id': user['id'],
            'email': user['email']
        }
        
        token = jwt.encode(token_payload, Config.JWT_SECRET, algorithm='HS256')
        
        # Store user info in session
        session['user_id'] = user['id']
        session['user_email'] = user['email']
        session['user_name'] = user['name']

        return jsonify({
            'success': True, 
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name']
            }
        }), 200
        
    except Exception as e:
        logger.error(f'Login error: {str(e)}')
        return jsonify({'success': False, 'message': 'An error occurred during login'}), 500

def logout():
    try:
        session.clear()
        return jsonify({'success': True, 'message': 'Logged out successfully'}), 200
    except Exception as e:
        logger.error(f'Logout error: {str(e)}')
        return jsonify({'success': False, 'message': 'An error occurred during logout'}), 500

def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400

        # Check if Supabase client is initialized
        if supabase is None:
            logger.error("Supabase client is not initialized")
            return jsonify({'success': False, 'message': 'Database connection error'}), 500

        # Check if user exists
        result = supabase.table('users').select('*').eq('email', email).execute()
        users = result.data
        
        if not users:
            # We don't reveal if the email exists for security reasons
            return jsonify({'success': True, 'message': 'If the email exists, a password reset link has been sent'}), 200

        user = users[0]
        
        # Generate OTP
        otp = str(uuid.uuid4().int)[:6]
        otp_hash, salt = hash_password(otp)

        # Store OTP in database
        otp_data = {
            'user_id': user['id'],
            'otp_hash': otp_hash,
            'salt': salt
        }
        
        # Delete any existing OTPs for this user
        supabase.table('password_resets').delete().eq('user_id', user['id']).execute()
        
        # Insert new OTP
        supabase.table('password_resets').insert(otp_data).execute()

        # Send OTP email
        email_sent = send_password_reset_email(email, user['name'], otp)
        
        if email_sent:
            return jsonify({'success': True, 'message': 'If the email exists, a password reset link has been sent'}), 200
        else:
            return jsonify({'success': False, 'message': 'Failed to send email'}), 500
            
    except Exception as e:
        logger.error(f'Forgot password error: {str(e)}')
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

def reset_password():
    try:
        data = request.get_json()
        email = data.get('email')
        otp = data.get('otp')
        new_password = data.get('newPassword')
        confirm_password = data.get('confirmPassword')

        # Validation
        if not email or not otp or not new_password or not confirm_password:
            return jsonify({'success': False, 'message': 'All fields are required'}), 400

        if new_password != confirm_password:
            return jsonify({'success': False, 'message': 'Passwords do not match'}), 400

        if len(new_password) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400

        # Check if Supabase client is initialized
        if supabase is None:
            logger.error("Supabase client is not initialized")
            return jsonify({'success': False, 'message': 'Database connection error'}), 500

        # Get user
        user_result = supabase.table('users').select('*').eq('email', email).execute()
        users = user_result.data
        
        if not users:
            return jsonify({'success': False, 'message': 'Invalid request'}), 400

        user = users[0]

        # Get OTP record
        otp_result = supabase.table('password_resets').select('*').eq('user_id', user['id']).execute()
        otp_records = otp_result.data
        
        if not otp_records:
            return jsonify({'success': False, 'message': 'Invalid or expired OTP'}), 400

        otp_record = otp_records[0]
        otp_hash = otp_record['otp_hash']
        salt = otp_record['salt']

        # Verify OTP
        if not verify_password(otp_hash, salt, otp):
            return jsonify({'success': False, 'message': 'Invalid or expired OTP'}), 400

        # Hash new password
        new_hashed_password, new_salt = hash_password(new_password)

        # Update password
        supabase.table('users').update({
            'password_hash': new_hashed_password,
            'salt': new_salt
        }).eq('id', user['id']).execute()

        # Delete OTP record
        supabase.table('password_resets').delete().eq('user_id', user['id']).execute()

        return jsonify({'success': True, 'message': 'Password reset successfully'}), 200
        
    except Exception as e:
        logger.error(f'Reset password error: {str(e)}')
        return jsonify({'success': False, 'message': 'An error occurred'}), 500