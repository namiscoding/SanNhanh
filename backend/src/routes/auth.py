from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from src.models.database import db, User
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import os

auth_bp = Blueprint('auth', __name__)

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', 'your-google-client-id')

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['fullName', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if user already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create new user
        user = User(
            fullName=data['fullName'],
            email=data['email'],
            passwordHash=generate_password_hash(data['password']),
            role='Customer',
            accountStatus=1
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'fullName': user.fullName,
                'email': user.email,
                'role': user.role,
                'accountStatus': user.accountStatus
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = User.query.filter_by(email=data['email']).first()
        
        if not user or not check_password_hash(user.passwordHash, data['password']):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if user.accountStatus == 0:
            return jsonify({'error': 'Account is disabled'}), 403
        
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'fullName': user.fullName,
                'email': user.email,
                'role': user.role,
                'accountStatus': user.accountStatus,
                'image': user.image
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Google token is required'}), 400
        
        # Verify Google token
        try:
            idinfo = id_token.verify_oauth2_token(
                token, google_requests.Request(), GOOGLE_CLIENT_ID
            )
            
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Wrong issuer.')
                
        except ValueError as e:
            return jsonify({'error': 'Invalid Google token'}), 401
        
        email = idinfo['email']
        name = idinfo['name']
        picture = idinfo.get('picture', '')
        
        # Check if user exists
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Create new user
            user = User(
                fullName=name,
                email=email,
                passwordHash='',  # No password for Google users
                role='Customer',
                accountStatus=1,
                image=picture
            )
            db.session.add(user)
            db.session.commit()
        else:
            # Update user image if changed
            if user.image != picture:
                user.image = picture
                db.session.commit()
        
        if user.accountStatus == 0:
            return jsonify({'error': 'Account is disabled'}), 403
        
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'Google login successful',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'fullName': user.fullName,
                'email': user.email,
                'role': user.role,
                'accountStatus': user.accountStatus,
                'image': user.image
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': {
                'id': user.id,
                'fullName': user.fullName,
                'email': user.email,
                'role': user.role,
                'accountStatus': user.accountStatus,
                'image': user.image
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required()
def refresh_token():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.accountStatus == 0:
            return jsonify({'error': 'Invalid user'}), 401
        
        new_token = create_access_token(identity=user_id)
        
        return jsonify({
            'access_token': new_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

