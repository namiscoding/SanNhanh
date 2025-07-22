from decimal import Decimal
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, jwt_required
from src.models.database import db, User, Booking, Court, CourtComplex, HourlyPriceRate
from src.services.email_service import EmailService
import src.services.vietqr_service as vietqr_service_module
from datetime import datetime, timedelta
import uuid

booking_bp = Blueprint('booking', __name__)

@booking_bp.route('/create', methods=['POST'])
@jwt_required()
def create_booking():
    """Create a new booking"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        required_fields = ['courtId', 'startTime', 'endTime']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Parse datetime
        start_dt = datetime.fromisoformat(data['startTime']) # Không cần .replace('Z', '+00:00')
        end_dt = datetime.fromisoformat(data['endTime'])
        
        # Validate time range
        if start_dt >= end_dt:
            return jsonify({'error': 'Start time must be before end time'}), 400
        
        # Cannot book in the past
        # So sánh với thời gian hiện tại của server
        if start_dt < datetime.now(): # datetime.now() không có timezone info, cần cẩn thận nếu server khác múi giờ frontend
             return jsonify({'error': 'Cannot book in the past'}), 400
        
        # Validate minimum booking duration (30 minutes)
        duration_minutes = (end_dt - start_dt).total_seconds() / 60
        if duration_minutes < 30:
            return jsonify({'error': 'Minimum booking duration is 30 minutes'}), 400
        
        # Get court and its complex
        court = Court.query.options(db.joinedload(Court.complex)).get(data['courtId'])
        if not court or court.status != 'Active':
            return jsonify({'error': 'Court not found or inactive'}), 404
        
        # Check if court complex is active
        complex = court.complex # Lấy complex từ court đã loadjoinedload
        if not complex or complex.status != 'Active':
            return jsonify({'error': 'Court complex not found or inactive'}), 404

        # Check if booking is within complex's operating hours
        complex_open_time = complex.openTime
        complex_close_time = complex.closeTime

        if start_dt.time() < complex_open_time or end_dt.time() > complex_close_time: # Dùng .time() để so sánh HH:MM
            return jsonify({
                'error': f'Giờ đặt sân nằm ngoài giờ hoạt động của khu phức hợp ({complex_open_time.strftime("%H:%M")} - {complex_close_time.strftime("%H:%M")}).'
            }), 400
        
        # Check for conflicting bookings
        conflicting_booking = Booking.query.filter(
            Booking.courtId == data['courtId'],
            Booking.status.in_(['Pending', 'Confirmed']),
            # Logic kiểm tra overlap giữa 2 khoảng thời gian
            # (start_A < end_B AND end_A > start_B)
            db.and_(
                Booking.startTime < end_dt,
                Booking.endTime > start_dt
            )
        ).first()
        
        if conflicting_booking:
            return jsonify({'error': 'Time slot is already booked'}), 400
        
        # --- BẮT ĐẦU LOGIC TÍNH TỔNG GIÁ TỪ API check_availability ---
        estimated_price_decimal = Decimal(0)
        
        day_names_map = {
            0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday",
            4: "Friday", 5: "Saturday", 6: "Sunday"
        }
        current_day_name = day_names_map[start_dt.weekday()]

        all_rates_for_court = HourlyPriceRate.query.filter(
            HourlyPriceRate.courtId == data['courtId'],
            db.or_(
                HourlyPriceRate.dayOfWeek == current_day_name,
                HourlyPriceRate.dayOfWeek == 'All'
            )
        ).order_by(HourlyPriceRate.startTime).all()

        if not all_rates_for_court:
            return jsonify({
                'error': 'Không tìm thấy bảng giá cho sân này trong khung giờ yêu cầu.'
            }), 400

        time_pointer = start_dt # Sử dụng datetime object
        
        while time_pointer < end_dt:
            current_segment_time_only = time_pointer.time()
            
            applicable_rate = None
            for rate in all_rates_for_court:
                if rate.dayOfWeek == current_day_name and \
                   rate.startTime <= current_segment_time_only and \
                   rate.endTime > current_segment_time_only:
                    applicable_rate = rate
                    break 
            
            if not applicable_rate:
                for rate in all_rates_for_court:
                    if rate.dayOfWeek == 'All' and \
                       rate.startTime <= current_segment_time_only and \
                       rate.endTime > current_segment_time_only:
                        applicable_rate = rate
                        break
            
            if not applicable_rate:
                return jsonify({
                    'error': f'Không tìm thấy giá cho khung giờ {current_segment_time_only.strftime("%H:%M")} vào {current_day_name}.'
                }), 400

            segment_end_for_rate_time_only = applicable_rate.endTime
            segment_end_dt_at_rate = datetime.combine(time_pointer.date(), segment_end_for_rate_time_only)

            current_segment_end = min(end_dt, segment_end_dt_at_rate)
            
            duration_seconds_in_segment = (current_segment_end - time_pointer).total_seconds()
            duration_hours_decimal = Decimal(str(duration_seconds_in_segment / 3600))

            estimated_price_decimal += applicable_rate.price * duration_hours_decimal
            
            time_pointer = current_segment_end

        total_price = float(estimated_price_decimal) # Chuyển đổi về float để lưu vào DB và trả về JSON
        
        # --- KẾT THÚC LOGIC TÍNH TỔNG GIÁ ---

        # Create booking
        new_booking = Booking(
            customerId=user_id,
            courtId=data['courtId'],
            startTime=start_dt, # Dùng start_dt và end_dt
            endTime=end_dt,     # Dùng start_dt và end_dt
            totalPrice=total_price,
            status='Pending',
            bookingType='Online'
        )
        
        db.session.add(new_booking)
        db.session.commit()
        
        # Generate VietQR payment info
        payment_info = None
        # Kiểm tra sự tồn tại của các trường trước khi sử dụng
        if complex.bankCode and complex.accountNumber:
            # Import vietqr_service và EmailService nếu chưa có
            from src.services import vietqr_service, email_service # Giả định đây là đường dẫn đúng

            payment_info = vietqr_service_module.vietqr_service.generate_booking_qr( 
                court_complex=complex,
                booking_id=new_booking.id,
                amount=int(total_price),
                customer_name=user.fullName
            )
        
        # Fallback payment info if VietQR not available
        if not payment_info:
            payment_info = {
                'bank_code': complex.bankCode if complex.bankCode else 'N/A',
                'account_number': complex.accountNumber if complex.accountNumber else 'N/A',
                'account_name': complex.accountName if complex.accountName else 'N/A',
                'amount': int(float(total_price)), # Vẫn là integer
                'description': f'SportSync {new_booking.id} {user.fullName}'
            }
        
        # Send confirmation email
        try:
            from src.services import email_service # Giả định đây là đường dẫn đúng
            EmailService.send_booking_confirmation(
                user.email,
                user.fullName,
                {
                    'id': new_booking.id,
                    'courtName': court.name,
                    'complexName': complex.name,
                    'startTime': new_booking.startTime.strftime('%d/%m/%Y %H:%M'),
                    'endTime': new_booking.endTime.strftime('%d/%m/%Y %H:%M'),
                    'totalPrice': total_price
                }
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
            # Log the full traceback for email sending errors
            import traceback
            traceback.print_exc()
        
        return jsonify({
            'message': 'Booking created successfully',
            'booking': {
                'id': new_booking.id,
                'courtId': new_booking.courtId,
                'courtName': court.name,
                'complexName': complex.name,
                'startTime': new_booking.startTime.isoformat(),
                'endTime': new_booking.endTime.isoformat(),
                'totalPrice': float(new_booking.totalPrice), # Đảm bảo là float khi trả về JSON
                'status': new_booking.status,
                'paymentInfo': payment_info
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@booking_bp.route('/my-bookings', methods=['GET'])
@jwt_required()
def get_my_bookings():
    """
    Get customer's own bookings with pagination, sorting, and filtering.
    Query Params:
        page (int): Current page number (default: 1)
        limit (int): Items per page (default: 10)
        sortBy (str): Field to sort by (e.g., 'createdAt', 'startTime', 'totalPrice', 'status')
        sortOrder (str): 'asc' or 'desc' (default: 'desc')
        status (str): Filter by booking status (e.g., 'Pending', 'Confirmed', 'Completed', 'Rejected', 'Cancelled')
        search (str): Search by court name, complex name
    """
    try:
        user_id = get_jwt_identity()
        customer_user = User.query.get(user_id)
        
        if not customer_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Lấy query parameters
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        sort_by = request.args.get('sortBy', 'createdAt')
        sort_order = request.args.get('sortOrder', 'desc')
        filter_status = request.args.get('status')
        search_query = request.args.get('search')
        
        # Bắt đầu truy vấn
        bookings_query = db.session.query(Booking).options(
            db.joinedload(Booking.court).joinedload(Court.complex) # Load court và complex
        ).filter(
            Booking.customerId == user_id # Chỉ lấy booking của user này
        )

        # Lọc theo trạng thái
        if filter_status and filter_status in ['Pending', 'Confirmed', 'Completed', 'Rejected', 'Cancelled']:
            bookings_query = bookings_query.filter(Booking.status == filter_status)

        # Tìm kiếm
        if search_query:
            search_pattern = f"%{search_query}%"
            bookings_query = bookings_query.filter(
                db.or_(
                    Booking.court.has(Court.name.ilike(search_pattern)),
                    Booking.court.has(Court.complex.has(CourtComplex.name.ilike(search_pattern))),
                )
            )

        # Sắp xếp
        if sort_by:
            sort_columns = {
                'createdAt': Booking.createdAt,
                'startTime': Booking.startTime,
                'totalPrice': Booking.totalPrice,
                'status': Booking.status,
                'courtName': Court.name,
                'complexName': CourtComplex.name,
            }
            
            sort_column = sort_columns.get(sort_by)
            if sort_column is not None:
                # Nếu sắp xếp theo courtName hoặc complexName, cần đảm bảo join với Court và CourtComplex
                if sort_by in ['courtName', 'complexName']:
                    bookings_query = bookings_query.join(Court).join(CourtComplex) # Đảm bảo join nếu chưa
                
                if sort_order == 'asc':
                    bookings_query = bookings_query.order_by(sort_column.asc())
                else:
                    bookings_query = bookings_query.order_by(sort_column.desc())
            else:
                bookings_query = bookings_query.order_by(Booking.createdAt.desc())
        else:
            bookings_query = bookings_query.order_by(Booking.createdAt.desc())


        # Thực hiện phân trang
        paginated_bookings = bookings_query.paginate(page=page, per_page=limit, error_out=False)
        
        bookings_data = []
        for booking in paginated_bookings.items:
            # Thông tin khách hàng không cần thiết ở đây vì luôn là user hiện tại
            # Nhưng chúng ta cần thông tin sân và khu phức hợp
            court = booking.court
            complex_data = court.complex

            bookings_data.append({
                'id': booking.id,
                'courtName': court.name,
                'complexName': complex_data.name,
                'startTime': booking.startTime.isoformat(),
                'endTime': booking.endTime.isoformat(),
                'totalPrice': float(booking.totalPrice),
                'status': booking.status,
                'bookingType': booking.bookingType, # Có thể hữu ích
                'createdAt': booking.createdAt.isoformat(),
                'complexAddress': complex_data.address, # Để hiển thị trong chi tiết
                'complexCity': complex_data.city,
            })
        
        return jsonify({
            'bookings': bookings_data,
            'totalItems': paginated_bookings.total,
            'totalPages': paginated_bookings.pages,
            'currentPage': paginated_bookings.page,
            'perPage': paginated_bookings.per_page
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
@booking_bp.route('/<int:booking_id>', methods=['GET'])
@jwt_required()
def get_booking_detail(booking_id):
    """Get booking details"""
    try:
        user_id = get_jwt_identity()
        
        booking = Booking.query.filter_by(id=booking_id, customerId=user_id).first()
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        court = Court.query.get(booking.courtId)
        complex = CourtComplex.query.get(court.complexId) if court else None
        
        booking_data = {
            'id': booking.id,
            'courtId': booking.courtId,
            'courtName': court.name if court else 'Unknown',
            'complexName': complex.name if complex else 'Unknown',
            'complexAddress': complex.address if complex else '',
            'complexPhone': complex.phoneNumber if complex else '',
            'googleMapLink': complex.googleMapLink if complex else '',
            'startTime': booking.startTime.isoformat(),
            'endTime': booking.endTime.isoformat(),
            'totalPrice': float(booking.totalPrice),
            'status': booking.status,
            'createdAt': booking.createdAt.isoformat(),
            'paymentInfo': {
                'bankName': 'Vietcombank',
                'accountNumber': '1234567890',
                'accountName': 'CONG TY SPORTSYNC',
                'amount': float(booking.totalPrice),
                'content': f'THANHTOAN {booking.id} {booking.customer.fullName}'
            }
        }
        
        return jsonify(booking_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@booking_bp.route('/<int:booking_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_booking(booking_id):
    """Cancel a booking"""
    try:
        user_id = get_jwt_identity()
        
        booking = Booking.query.filter_by(id=booking_id, customerId=user_id).first()
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        if booking.status not in ['Pending', 'Confirmed']:
            return jsonify({'error': 'Cannot cancel this booking'}), 400
        
        # Check if booking is at least 2 hours in the future
        if booking.startTime < datetime.now() + timedelta(hours=2):
            return jsonify({'error': 'Cannot cancel booking less than 2 hours before start time'}), 400
        
        booking.status = 'Cancelled'
        db.session.commit()
        
        # Send cancellation email
        try:
            court = Court.query.get(booking.courtId)
            complex = CourtComplex.query.get(court.complexId) if court else None
            user = User.query.get(user_id)
            
            EmailService.send_booking_cancellation(
                user.email,
                user.fullName,
                {
                    'id': booking.id,
                    'courtName': court.name if court else 'Unknown',
                    'complexName': complex.name if complex else 'Unknown',
                    'startTime': booking.startTime.strftime('%d/%m/%Y %H:%M'),
                    'endTime': booking.endTime.strftime('%d/%m/%Y %H:%M')
                }
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
        
        return jsonify({'message': 'Booking cancelled successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@booking_bp.route('/walk-in', methods=['POST'])
@jwt_required()
def create_walk_in_booking():
    """Create a walk-in booking (for owners)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Only owners can create walk-in bookings'}), 403
        
        data = request.get_json()
        required_fields = ['courtId', 'startTime', 'endTime', 'customerName', 'customerPhone']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Parse datetime
        start_dt = datetime.fromisoformat(data['startTime'].replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(data['endTime'].replace('Z', '+00:00'))
        
        # Validate time range
        if start_dt >= end_dt:
            return jsonify({'error': 'Start time must be before end time'}), 400
        
        # Validate minimum booking duration (30 minutes)
        duration_minutes = (end_dt - start_dt).total_seconds() / 60
        if duration_minutes < 30:
            return jsonify({'error': 'Minimum booking duration is 30 minutes'}), 400
        
        # Get court and verify owner owns it
        court = Court.query.options(db.joinedload(Court.complex)).get(data['courtId']) # Load complex
        if not court or court.status != 'Active':
            return jsonify({'error': 'Court not found or inactive'}), 404
        
        complex = court.complex # Lấy complex từ court đã load
        if not complex or complex.ownerId != user_id:
            return jsonify({'error': 'You can only create bookings for your own courts'}), 403

        # Check if booking is within complex's operating hours
        complex_open_time = complex.openTime
        complex_close_time = complex.closeTime

        if start_dt.time() < complex_open_time or end_dt.time() > complex_close_time:
            return jsonify({
                'error': f'Giờ đặt sân nằm ngoài giờ hoạt động của khu phức hợp ({complex_open_time.strftime("%H:%M")} - {complex_close_time.strftime("%H:%M")}).'
            }), 400
        
        # Check for conflicting bookings
        conflicting_booking = Booking.query.filter(
            Booking.courtId == data['courtId'],
            Booking.status.in_(['Pending', 'Confirmed']),
            db.and_(Booking.startTime < end_dt, Booking.endTime > start_dt)
        ).first()
        
        if conflicting_booking:
            return jsonify({'error': 'Time slot is already booked'}), 400
        
        # --- BẮT ĐẦU LOGIC TÍNH TỔNG GIÁ TỪ API check_availability ---
        estimated_price_decimal = Decimal(0)
        
        day_names_map = {
            0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday",
            4: "Friday", 5: "Saturday", 6: "Sunday"
        }
        current_day_name = day_names_map[start_dt.weekday()]

        all_rates_for_court = HourlyPriceRate.query.filter(
            HourlyPriceRate.courtId == data['courtId'],
            db.or_(
                HourlyPriceRate.dayOfWeek == current_day_name,
                HourlyPriceRate.dayOfWeek == 'All'
            )
        ).order_by(HourlyPriceRate.startTime).all()

        if not all_rates_for_court:
            return jsonify({
                'error': 'Không tìm thấy bảng giá cho sân này trong khung giờ yêu cầu.'
            }), 400

        time_pointer = start_dt
        
        while time_pointer < end_dt:
            current_segment_time_only = time_pointer.time()
            
            applicable_rate = None
            for rate in all_rates_for_court:
                if rate.dayOfWeek == current_day_name and \
                   rate.startTime <= current_segment_time_only and \
                   rate.endTime > current_segment_time_only:
                    applicable_rate = rate
                    break 
            
            if not applicable_rate:
                for rate in all_rates_for_court:
                    if rate.dayOfWeek == 'All' and \
                       rate.startTime <= current_segment_time_only and \
                       rate.endTime > current_segment_time_only:
                        applicable_rate = rate
                        break
            
            if not applicable_rate:
                return jsonify({
                    'error': f'Không tìm thấy giá cho khung giờ {current_segment_time_only.strftime("%H:%M")} vào {current_day_name}.'
                }), 400

            segment_end_for_rate_time_only = applicable_rate.endTime
            segment_end_dt_at_rate = datetime.combine(time_pointer.date(), segment_end_for_rate_time_only)

            current_segment_end = min(end_dt, segment_end_dt_at_rate)
            
            duration_seconds_in_segment = (current_segment_end - time_pointer).total_seconds()
            duration_hours_decimal = Decimal(str(duration_seconds_in_segment / 3600))

            estimated_price_decimal += applicable_rate.price * duration_hours_decimal
            
            time_pointer = current_segment_end

        total_price = float(estimated_price_decimal)
        
        # --- KẾT THÚC LOGIC TÍNH TỔNG GIÁ ---
        
        # Create walk-in booking
        new_booking = Booking(
            customerId=None, 
            courtId=data['courtId'],
            walkInCustomerName=data['customerName'],
            walkInCustomerPhone=data['customerPhone'],
            startTime=start_dt,
            endTime=end_dt,
            totalPrice=total_price,
            status='Confirmed', # Walk-in bookings are immediately confirmed
            bookingType='WalkIn'
        )
        
        db.session.add(new_booking)
        db.session.commit()
        
        return jsonify({
            'message': 'Walk-in booking created successfully',
            'bookingId': new_booking.id, # Trả về bookingId
            'booking': { # Trả về chi tiết booking nếu frontend cần
                'id': new_booking.id,
                'courtId': new_booking.courtId,
                'courtName': court.name,
                'complexName': complex.name,
                'customerName': new_booking.walkInCustomerName,
                'customerPhone': new_booking.walkInCustomerPhone,
                'startTime': new_booking.startTime.isoformat(),
                'endTime': new_booking.endTime.isoformat(),
                'totalPrice': float(new_booking.totalPrice),
                'status': new_booking.status,
                'bookingType': new_booking.bookingType
            }
        })
        
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@booking_bp.route('/<int:booking_id>/payment-info', methods=['GET'])
@jwt_required()
def get_payment_info(booking_id):
    """Get VietQR payment information for a booking"""
    try:
        user_id = get_jwt_identity()
        
        # Load booking, và joinedload Court, Complex và Customer cùng lúc
        booking = Booking.query.options(
            db.joinedload(Booking.court).joinedload(Court.complex),
            db.joinedload(Booking.customer)
        ).filter(Booking.id == booking_id, Booking.customerId == user_id).first()
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        # Lấy thông tin từ các đối tượng đã được joinedload
        court = booking.court
        complex = court.complex
        user = booking.customer # user ở đây là customer đã được load

        if not complex: # Complex sẽ không null nếu court đã được load đúng
            return jsonify({'error': 'Court complex not found'}), 404
        
        # Generate VietQR payment info
        payment_info = None
        if complex.bankCode and complex.accountNumber:
            payment_info = vietqr_service_module.vietqr_service.generate_booking_qr(
                court_complex=complex,
                booking_id=booking.id,
                amount=int(float(booking.totalPrice)), # Ensure amount is int for QR
                customer_name=user.fullName
            )
        
        # Fallback payment info if VietQR not available
        if not payment_info:
            payment_info = {
                'qr_url': None, # Rõ ràng là không có QR nếu không tạo được
                'bank_code': complex.bankCode if complex.bankCode else 'N/A',
                'account_number': complex.accountNumber if complex.accountNumber else 'N/A',
                'account_name': complex.accountName if complex.accountName else 'N/A',
                'amount': int(float(booking.totalPrice)),
                'description': f'SportSync {booking.id} {user.fullName}'
            }
        
        return jsonify({
            'booking': {
                'id': booking.id,
                'courtId': booking.courtId,
                'courtName': court.name,
                'complexName': complex.name,
                'startTime': booking.startTime.isoformat(),
                'endTime': booking.endTime.isoformat(),
                'totalPrice': float(booking.totalPrice),
                'status': booking.status,
                'complexPhoneNumber': complex.phoneNumber, # <<< THÊM SỐ ĐIỆN THOẠI CỦA CHỦ SÂN
                'complexAddress': complex.address, # Thêm địa chỉ để hiển thị trong chi tiết booking
                'complexCity': complex.city, # Thêm thành phố
            },
            'paymentInfo': payment_info
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@booking_bp.route('/check-availability', methods=['POST'])
@jwt_required() 
def check_availability():
    """Check if a time slot is available for booking and calculate estimated price"""
    try:
        user_id = get_jwt_identity() 
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        required_fields = ['courtId', 'startTime', 'endTime']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        start_dt = datetime.fromisoformat(data['startTime'])
        end_dt = datetime.fromisoformat(data['endTime'])
        
        start_time_only = start_dt.time()
        end_time_only = end_dt.time()

        if start_dt >= end_dt:
            return jsonify({'error': 'Start time must be before end time'}), 400
        
        if (end_dt - start_dt).total_seconds() < 30 * 60:
            return jsonify({'error': 'Booking duration must be at least 30 minutes'}), 400

        court = Court.query.options(db.joinedload(Court.complex)).get(data['courtId'])
        if not court or court.status != 'Active':
            return jsonify({'error': 'Court not found or inactive'}), 404
        
        complex_open_time = court.complex.openTime
        complex_close_time = court.complex.closeTime

        if start_time_only < complex_open_time or end_time_only > complex_close_time:
            return jsonify({
                'available': False,
                'estimatedPrice': 0,
                'conflictReason': f'Giờ đặt sân nằm ngoài giờ hoạt động của khu phức hợp ({complex_open_time.strftime("%H:%M")} - {complex_close_time.strftime("%H:%M")}).'
            }), 400

        conflicting_booking = Booking.query.filter(
            Booking.courtId == data['courtId'],
            Booking.status.in_(['Pending', 'Confirmed']),
            db.and_(Booking.startTime < end_dt, Booking.endTime > start_dt)
        ).first()
        
        available = conflicting_booking is None
        
        # SỬA LỖI Ở ĐÂY: KHỞI TẠO estimated_price VỚI GIÁ TRỊ MẶC ĐỊNH
        estimated_price = 0.0 # Khởi tạo estimated_price với giá trị mặc định float
        
        if available:
            estimated_price_decimal = Decimal(0) # Giữ nguyên Decimal cho tính toán
            
            day_names_map = {
                0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday",
                4: "Friday", 5: "Saturday", 6: "Sunday"
            }
            current_day_name = day_names_map[start_dt.weekday()]

            all_rates_for_court = HourlyPriceRate.query.filter(
                HourlyPriceRate.courtId == data['courtId'],
                db.or_(
                    HourlyPriceRate.dayOfWeek == current_day_name,
                    HourlyPriceRate.dayOfWeek == 'All'
                )
            ).order_by(HourlyPriceRate.startTime).all()

            if not all_rates_for_court:
                return jsonify({
                    'available': False,
                    'estimatedPrice': 0,
                    'conflictReason': 'Không tìm thấy bảng giá cho sân này trong khung giờ yêu cầu.'
                }), 400

            time_pointer = start_dt
            
            while time_pointer < end_dt:
                current_segment_time_only = time_pointer.time()
                
                applicable_rate = None
                for rate in all_rates_for_court:
                    if rate.dayOfWeek == current_day_name and \
                       rate.startTime <= current_segment_time_only and \
                       rate.endTime > current_segment_time_only: 
                        applicable_rate = rate
                        break 
                
                if not applicable_rate:
                    for rate in all_rates_for_court:
                        if rate.dayOfWeek == 'All' and \
                           rate.startTime <= current_segment_time_only and \
                           rate.endTime > current_segment_time_only:
                            applicable_rate = rate
                            break
                
                if not applicable_rate:
                    return jsonify({
                        'available': False,
                        'estimatedPrice': 0,
                        'conflictReason': f'Không tìm thấy giá cho khung giờ {current_segment_time_only.strftime("%H:%M")} vào {current_day_name}.'
                    }), 400

                segment_end_for_rate_time_only = applicable_rate.endTime
                segment_end_dt_at_rate = datetime.combine(time_pointer.date(), segment_end_for_rate_time_only)

                current_segment_end = min(end_dt, segment_end_dt_at_rate)
                
                duration_seconds_in_segment = (current_segment_end - time_pointer).total_seconds()
                duration_hours_decimal = Decimal(str(duration_seconds_in_segment / 3600)) 

                estimated_price_decimal += applicable_rate.price * duration_hours_decimal
                
                time_pointer = current_segment_end

            estimated_price = float(estimated_price_decimal) # Gán giá trị vào biến đã khởi tạo
        
        return jsonify({
            'available': available,
            'estimatedPrice': estimated_price, # estimated_price luôn có giá trị
            'conflictReason': 'Time slot is already booked' if not available else None
        })
        
    except Exception as e:
        db.session.rollback() 
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
