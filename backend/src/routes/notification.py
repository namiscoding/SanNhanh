from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.database import db, User, Notification
from datetime import datetime

notification_bp = Blueprint('notification', __name__)

@notification_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        current_user_id = get_jwt_identity()
        
        # Lấy query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        # Build query
        query = Notification.query.filter_by(userId=current_user_id)
        
        if unread_only:
            query = query.filter_by(isRead=False)
        
        # Pagination
        notifications_pagination = query.order_by(Notification.createdAt.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        notifications_data = []
        for notification in notifications_pagination.items:
            notifications_data.append({
                'id': notification.id,
                'title': notification.title,
                'message': notification.message,
                'type': notification.type,
                'isRead': notification.isRead,
                'createdAt': notification.createdAt.isoformat() if notification.createdAt else None
            })
        
        # Đếm số thông báo chưa đọc
        unread_count = Notification.query.filter_by(userId=current_user_id, isRead=False).count()
        
        return jsonify({
            'notifications': notifications_data,
            'pagination': {
                'page': page,
                'pages': notifications_pagination.pages,
                'per_page': per_page,
                'total': notifications_pagination.total
            },
            'unreadCount': unread_count
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_as_read(notification_id):
    try:
        current_user_id = get_jwt_identity()
        
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        # Kiểm tra quyền sở hữu
        if notification.userId != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        notification.isRead = True
        db.session.commit()
        
        return jsonify({'message': 'Notification marked as read'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/mark-all-read', methods=['PUT'])
@jwt_required()
def mark_all_as_read():
    try:
        current_user_id = get_jwt_identity()
        
        Notification.query.filter_by(userId=current_user_id, isRead=False).update({'isRead': True})
        db.session.commit()
        
        return jsonify({'message': 'All notifications marked as read'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/<int:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    try:
        current_user_id = get_jwt_identity()
        
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        # Kiểm tra quyền sở hữu
        if notification.userId != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        db.session.delete(notification)
        db.session.commit()
        
        return jsonify({'message': 'Notification deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Helper function để tạo notification (sử dụng trong các module khác)
def create_notification(user_id, title, message, notification_type='info'):
    """
    Tạo notification mới cho user
    
    Args:
        user_id: ID của user nhận notification
        title: Tiêu đề notification
        message: Nội dung notification
        notification_type: Loại notification (info, success, warning, error)
    """
    try:
        notification = Notification(
            userId=user_id,
            title=title,
            message=message,
            type=notification_type,
            isRead=False
        )
        
        db.session.add(notification)
        db.session.commit()
        
        return True
    except Exception as e:
        db.session.rollback()
        print(f"Error creating notification: {str(e)}")
        return False

