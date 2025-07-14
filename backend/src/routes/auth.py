from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from src.models.database import db, User
import bcrypt
import uuid

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'error': 'Email đã được sử dụng'}), 400
        
        # Hash password
        password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create new user
        new_user = User(
            full_name=data['fullName'],
            email=data['email'],
            password_hash=password_hash,
            role='Customer'
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=new_user.id)
        
        return jsonify({
            'message': 'Đăng ký thành công',
            'access_token': access_token,
            'user': {
                'id': new_user.id,
                'fullName': new_user.full_name,
                'email': new_user.email,
                'role': new_user.role,
                'image': new_user.image
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Find user by email
        user = User.query.filter_by(email=data['email']).first()
        if not user:
            return jsonify({'error': 'Email hoặc mật khẩu không đúng'}), 401
        
        # Check account status
        if user.account_status == 0:
            return jsonify({'error': 'Tài khoản đã bị khóa'}), 401
        
        # Check password
        if not bcrypt.checkpw(data['password'].encode('utf-8'), user.password_hash.encode('utf-8')):
            return jsonify({'error': 'Email hoặc mật khẩu không đúng'}), 401
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'Đăng nhập thành công',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'fullName': user.full_name,
                'email': user.email,
                'role': user.role,
                'image': user.image
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    try:
        data = request.get_json()
        
        # Check if user already exists
        user = User.query.filter_by(email=data['email']).first()
        
        if user:
            # Update user info from Google
            user.full_name = data['name']
            user.image = data['picture']
        else:
            # Create new user
            user = User(
                full_name=data['name'],
                email=data['email'],
                image=data['picture'],
                role='Customer'
            )
            db.session.add(user)
        
        db.session.commit()
        
        # Check account status
        if user.account_status == 0:
            return jsonify({'error': 'Tài khoản đã bị khóa'}), 401
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'Đăng nhập thành công',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'fullName': user.full_name,
                'email': user.email,
                'role': user.role,
                'image': user.image
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'Người dùng không tồn tại'}), 404
        
        return jsonify({
            'user': {
                'id': user.id,
                'fullName': user.full_name,
                'email': user.email,
                'role': user.role,
                'image': user.image
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

