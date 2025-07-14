from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.database import db, User

admin_bp = Blueprint('admin', __name__)

def admin_required():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    return user and user.role == 'Admin'

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    try:
        if not admin_required():
            return jsonify({'error': 'Không có quyền truy cập'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        
        query = User.query
        
        if search:
            query = query.filter(
                (User.full_name.contains(search)) | 
                (User.email.contains(search))
            )
        
        users = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'users': [{
                'id': user.id,
                'fullName': user.full_name,
                'email': user.email,
                'role': user.role,
                'accountStatus': user.account_status,
                'image': user.image,
                'createdAt': user.created_at.isoformat()
            } for user in users.items],
            'total': users.total,
            'pages': users.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<user_id>/status', methods=['PUT'])
@jwt_required()
def update_user_status():
    try:
        if not admin_required():
            return jsonify({'error': 'Không có quyền truy cập'}), 403
        
        user_id = request.view_args['user_id']
        data = request.get_json()
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Người dùng không tồn tại'}), 404
        
        user.account_status = data['accountStatus']
        db.session.commit()
        
        return jsonify({'message': 'Cập nhật trạng thái thành công'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<user_id>/upgrade-to-owner', methods=['PUT'])
@jwt_required()
def upgrade_to_owner():
    try:
        if not admin_required():
            return jsonify({'error': 'Không có quyền truy cập'}), 403
        
        user_id = request.view_args['user_id']
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Người dùng không tồn tại'}), 404
        
        if user.role == 'Owner':
            return jsonify({'error': 'Người dùng đã là chủ sân'}), 400
        
        user.role = 'Owner'
        db.session.commit()
        
        return jsonify({'message': 'Nâng cấp thành chủ sân thành công'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/search-users', methods=['GET'])
@jwt_required()
def search_users():
    try:
        if not admin_required():
            return jsonify({'error': 'Không có quyền truy cập'}), 403
        
        search_term = request.args.get('q', '')
        
        if not search_term:
            return jsonify({'users': []}), 200
        
        users = User.query.filter(
            (User.full_name.contains(search_term)) | 
            (User.email.contains(search_term))
        ).filter(User.role == 'Customer').limit(10).all()
        
        return jsonify({
            'users': [{
                'id': user.id,
                'fullName': user.full_name,
                'email': user.email,
                'role': user.role,
                'image': user.image
            } for user in users]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

