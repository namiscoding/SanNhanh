from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from src.models.database import Booking, Court, db, User, CourtComplex

admin_bp = Blueprint('admin', __name__)

def admin_required():
    user_id = get_jwt_identity()
    admin_user = User.query.get(user_id)
    if not admin_user or admin_user.role != 'Admin':
        return jsonify({'error': 'Access denied'}), 403
    return None # Trả về None nếu admin_user hợp lệ


@admin_bp.route('/statistics', methods=['GET'])
@jwt_required()
def get_admin_statistics():
    try:
        user_id = get_jwt_identity()
        admin_user = User.query.get(user_id)

        if not admin_user or admin_user.role != 'Admin':
            return jsonify({'error': 'Access denied'}), 403

        # 1. Total Users
        total_users = User.query.count()
        total_customers = User.query.filter_by(role='Customer').count()
        total_owners = User.query.filter_by(role='Owner').count()
        total_admins = User.query.filter_by(role='Admin').count()

        # 2. Total Active Court Complexes
        total_active_complexes = CourtComplex.query.filter_by(status='Active').count()
        
        # 3. Total Courts
        total_courts = Court.query.count()

        # 4. Total Bookings (all statuses)
        total_bookings = Booking.query.count()

        # 5. Total Platform Revenue (from confirmed/completed bookings)
        total_platform_revenue = db.session.query(func.sum(Booking.totalPrice)).filter(
            Booking.status.in_(['Confirmed', 'Completed'])
        ).scalar() or 0.0
        
        # 6. Total Confirmed/Completed Bookings (for AOV calculation)
        total_confirmed_completed_bookings = Booking.query.filter(
            Booking.status.in_(['Confirmed', 'Completed'])
        ).count()

        # 7. Average Order Value (AOV)
        average_order_value = 0.0
        if total_confirmed_completed_bookings > 0:
            average_order_value = total_platform_revenue / total_confirmed_completed_bookings
            average_order_value = round(average_order_value, 0) # Làm tròn AOV về số nguyên

        # --- Monthly Platform Statistics (Current Month) ---
        today = datetime.now()
        first_day_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if today.month == 12:
            last_day_of_month = today.replace(year=today.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(microseconds=1)
        else:
            last_day_of_month = today.replace(month=today.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(microseconds=1)
        
        monthly_platform_bookings = Booking.query.filter(
            Booking.createdAt >= first_day_of_month,
            Booking.createdAt <= last_day_of_month,
            Booking.status.in_(['Confirmed', 'Completed'])
        ).count()

        monthly_platform_revenue = db.session.query(func.sum(Booking.totalPrice)).filter(
            Booking.createdAt >= first_day_of_month,
            Booking.createdAt <= last_day_of_month,
            Booking.status.in_(['Confirmed', 'Completed'])
        ).scalar() or 0.0

        # --- Daily Bookings Trend (Last 7 days) ---
        daily_bookings_trend = []
        for i in range(7):
            day = today - timedelta(days=6 - i)
            start_of_day = day.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = day.replace(hour=23, minute=59, second=59, microsecond=999999)

            bookings_for_day = Booking.query.filter(
                Booking.createdAt >= start_of_day,
                Booking.createdAt <= end_of_day,
                Booking.status.in_(['Confirmed', 'Completed'])
            ).count()
            
            daily_bookings_trend.append({
                'date': day.strftime('%Y-%m-%d'),
                'count': bookings_for_day
            })

        return jsonify({
            'overview': {
                'totalUsers': total_users,
                'totalCustomers': total_customers,
                'totalOwners': total_owners,
                'totalAdmins': total_admins,
                'totalActiveComplexes': total_active_complexes,
                'totalCourts': total_courts,
                'totalBookings': total_bookings,
                'totalPlatformRevenue': float(total_platform_revenue),
                'averageOrderValue': float(average_order_value) # <<< THÊM AOV
            },
            'monthlyPlatformStats': {
                'bookings': monthly_platform_bookings,
                'revenue': float(monthly_platform_revenue)
            },
            'dailyBookingsTrend': daily_bookings_trend
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
@admin_bp.route('/users/<user_id>/role', methods=['PUT'])
@jwt_required()
def update_user_role(user_id):
    error = admin_required()
    if error:
        return error
    
    try:
        data = request.get_json()
        new_role = data.get('role')
        
        if new_role not in ['Customer', 'Owner', 'Admin']:
            return jsonify({'error': 'Invalid role'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user.role = new_role
        db.session.commit()
        
        return jsonify({
            'message': 'User role updated successfully',
            'user': {
                'id': user.id,
                'fullName': user.fullName,
                'email': user.email,
                'role': user.role,
                'accountStatus': user.accountStatus
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<user_id>/status', methods=['PUT'])
@jwt_required()
def update_user_status(user_id):
    error = admin_required()
    if error:
        return error
    
    try:
        data = request.get_json()
        new_status = data.get('accountStatus')
        
        if new_status not in [0, 1]:
            return jsonify({'error': 'Invalid status'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user.accountStatus = new_status
        db.session.commit()
        
        return jsonify({
            'message': 'User status updated successfully',
            'user': {
                'id': user.id,
                'fullName': user.fullName,
                'email': user.email,
                'role': user.role,
                'accountStatus': user.accountStatus
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/court-complexes', methods=['GET'])
@jwt_required()
def get_all_court_complexes():
    error = admin_required()
    if error:
        return error
    
    try:
        complexes = CourtComplex.query.all()
        complexes_data = []
        
        for complex in complexes:
            owner = User.query.get(complex.ownerId)
            complexes_data.append({
                'id': complex.id,
                'name': complex.name,
                'address': complex.address,
                'city': complex.city,
                'status': complex.status,
                'ownerId': complex.ownerId,
                'ownerName': owner.fullName if owner else 'Unknown',
                'createdAt': complex.createdAt.isoformat() if complex.createdAt else None
            })
        
        return jsonify({'courtComplexes': complexes_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    """
    Get all users with pagination, sorting, and filtering for Admin panel.
    Query Params:
        page (int): Current page number (default: 1)
        limit (int): Items per page (default: 10)
        sortBy (str): Field to sort by (e.g., 'createdAt', 'fullName', 'email', 'role', 'accountStatus')
        sortOrder (str): 'asc' or 'desc' (default: 'desc')
        role (str): Filter by user role (e.g., 'Customer', 'Owner', 'Admin')
        status (int): Filter by account status (0=Locked, 1=Active)
        search (str): Search by fullName or email
    """
    # Kiểm tra quyền admin
    error = admin_required()
    if error:
        return error
    
    try:
        # Lấy query parameters
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        sort_by = request.args.get('sortBy', 'createdAt')
        sort_order = request.args.get('sortOrder', 'desc')
        filter_role = request.args.get('role')
        filter_status = request.args.get('status', type=int) # Filter by 0 or 1
        search_query = request.args.get('search')

        users_query = User.query # Bắt đầu truy vấn

        # Lọc theo vai trò
        if filter_role and filter_role in ['Customer', 'Owner', 'Admin']:
            users_query = users_query.filter(User.role == filter_role)

        # Lọc theo trạng thái tài khoản
        # is not None để phân biệt giữa không gửi params và gửi status=0
        if filter_status is not None and filter_status in [0, 1]: 
            users_query = users_query.filter(User.accountStatus == filter_status)

        # Tìm kiếm theo fullName hoặc email
        if search_query:
            search_pattern = f"%{search_query}%"
            users_query = users_query.filter(
                db.or_(
                    User.fullName.ilike(search_pattern),
                    User.email.ilike(search_pattern)
                )
            )

        # Sắp xếp
        if sort_by:
            # Ánh xạ tên cột từ frontend sang các thuộc tính model
            sort_columns = {
                'createdAt': User.createdAt,
                'fullName': User.fullName,
                'email': User.email,
                'role': User.role,
                'accountStatus': User.accountStatus,
            }
            sort_column = sort_columns.get(sort_by)

            if sort_column is not None: # Đảm bảo cột sắp xếp hợp lệ
                if sort_order == 'asc':
                    users_query = users_query.order_by(sort_column.asc())
                else:
                    users_query = users_query.order_by(sort_column.desc())
            else:
                # Mặc định sắp xếp nếu sortBy không hợp lệ
                users_query = users_query.order_by(User.createdAt.desc())
        else:
            # Mặc định sắp xếp nếu không có sortBy được cung cấp
            users_query = users_query.order_by(User.createdAt.desc())

        # Thực hiện phân trang
        paginated_users = users_query.paginate(page=page, per_page=limit, error_out=False)
        
        users_data = []
        for user in paginated_users.items:
            users_data.append({
                'id': user.id,
                'fullName': user.fullName,
                'email': user.email,
                'role': user.role,
                'accountStatus': user.accountStatus,
                'createdAt': user.createdAt.isoformat() if user.createdAt else None,
                # Nếu bạn đã thêm phoneNumber vào User model và muốn trả về:
                # 'phoneNumber': user.phoneNumber if hasattr(user, 'phoneNumber') else None,
            })
        
        return jsonify({
            'users': users_data,
            'totalItems': paginated_users.total,
            'totalPages': paginated_users.pages,
            'currentPage': paginated_users.page,
            'perPage': paginated_users.per_page
        }), 200
        
    except Exception as e:
        db.session.rollback() # Luôn rollback transaction nếu có lỗi
        import traceback
        traceback.print_exc() # In traceback đầy đủ ra console của server để debug
        return jsonify({'error': str(e)}), 500

