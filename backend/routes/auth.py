from flask import Blueprint, request, jsonify
from controllers.auth_controller import (
    signup,
    login, 
    logout,
    forgot_password,
    reset_password
)

# Create blueprint
auth_bp = Blueprint('auth', __name__)

# Define routes
@auth_bp.route('/signup', methods=['POST'])
def signup_route():
    return signup()

@auth_bp.route('/login', methods=['POST'])
def login_route():
    return login()

@auth_bp.route('/logout', methods=['POST'])
def logout_route():
    return logout()

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password_route():
    return forgot_password()

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password_route():
    return reset_password()