from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.database import db, Booking, Court, CourtComplex, User, HourlyPriceRate, Product, BookingProduct
from datetime import datetime, timedelta
from decimal import Decimal

booking_bp = Blueprint('booking', __name__)

def owner_required():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    return user and user.role in ['Owner', 'Admin']

@booking_bp.route('/courts/<int:court_id>/availability', methods=['GET'])
def get_court_availability(court_id):
    try:
        date_str = request.args.get('date')
        if not date_str:
            return jsonify({'error': 'Thiếu tham số ngày'}), 400
        
        date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Get existing bookings for this court on this date
        start_of_day = datetime.combine(date, datetime.min.time())
        end_of_day = datetime.combine(date, datetime.max.time())
        
        bookings = Booking.query.filter(
            Booking.court_id == court_id,
            Booking.booked_start_time >= start_of_day,
            Booking.booked_start_time <= end_of_day,
            Booking.booking_status.in_([1, 2])  # Pending or Confirmed
        ).all()
        
        # Get hourly rates for this court
        day_of_week = date.weekday() + 1  # Convert to 1-7 format
        rates = HourlyPriceRate.query.filter(
            HourlyPriceRate.court_id == court_id,
            (HourlyPriceRate.day_of_week == day_of_week) | (HourlyPriceRate.day_of_week.is_(None))
        ).all()
        
        # Generate time slots (6 AM to 11 PM)
        time_slots = []
        current_time = datetime.combine(date, datetime.min.time().replace(hour=6))
        end_time = datetime.combine(date, datetime.min.time().replace(hour=23))
        
        while current_time < end_time:
            slot_end = current_time + timedelta(hours=1)
            
            # Check if slot is booked
            is_booked = any(
                booking.booked_start_time <= current_time < booking.booked_end_time
                for booking in bookings
            )
            
            # Find applicable rate
            applicable_rate = None
            for rate in rates:
                if rate.start_time <= current_time.time() < rate.end_time:
                    applicable_rate = rate
                    break
            
            time_slots.append({
                'startTime': current_time.isoformat(),
                'endTime': slot_end.isoformat(),
                'isAvailable': not is_booked,
                'pricePerHour': float(applicable_rate.price_per_hour) if applicable_rate else 0
            })
            
            current_time = slot_end
        
        return jsonify({'timeSlots': time_slots}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@booking_bp.route('', methods=['POST'])
@jwt_required()
def create_booking():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        court_id = data['courtId']
        start_time = datetime.fromisoformat(data['startTime'])
        end_time = datetime.fromisoformat(data['endTime'])
        
        # Check if court exists
        court = Court.query.get(court_id)
        if not court:
            return jsonify({'error': 'Sân không tồn tại'}), 404
        
        # Check if time slot is available
        existing_booking = Booking.query.filter(
            Booking.court_id == court_id,
            Booking.booking_status.in_([1, 2]),  # Pending or Confirmed
            ((Booking.booked_start_time <= start_time) & (Booking.booked_end_time > start_time)) |
            ((Booking.booked_start_time < end_time) & (Booking.booked_end_time >= end_time)) |
            ((Booking.booked_start_time >= start_time) & (Booking.booked_end_time <= end_time))
        ).first()
        
        if existing_booking:
            return jsonify({'error': 'Khung giờ đã được đặt'}), 400
        
        # Calculate total price
        duration_hours = (end_time - start_time).total_seconds() / 3600
        day_of_week = start_time.weekday() + 1
        
        # Find applicable hourly rate
        rate = HourlyPriceRate.query.filter(
            HourlyPriceRate.court_id == court_id,
            HourlyPriceRate.start_time <= start_time.time(),
            HourlyPriceRate.end_time > start_time.time(),
            (HourlyPriceRate.day_of_week == day_of_week) | (HourlyPriceRate.day_of_week.is_(None))
        ).first()
        
        if not rate:
            return jsonify({'error': 'Không tìm thấy bảng giá cho khung giờ này'}), 400
        
        total_price = Decimal(str(rate.price_per_hour)) * Decimal(str(duration_hours))
        
        # Create booking
        new_booking = Booking(
            booker_user_id=current_user_id,
            court_id=court_id,
            booked_start_time=start_time,
            booked_end_time=end_time,
            total_price=total_price,
            booking_status=1  # Pending confirmation
        )
        
        db.session.add(new_booking)
        db.session.commit()
        
        return jsonify({
            'message': 'Đặt sân thành công',
            'bookingId': new_booking.id,
            'totalPrice': float(total_price)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@booking_bp.route('/my-bookings', methods=['GET'])
@jwt_required()
def get_my_bookings():
    try:
        current_user_id = get_jwt_identity()
        
        bookings = db.session.query(Booking).join(Court).join(CourtComplex).filter(
            Booking.booker_user_id == current_user_id
        ).order_by(Booking.created_at.desc()).all()
        
        result = []
        for booking in bookings:
            result.append({
                'id': booking.id,
                'courtName': booking.court.name,
                'complexName': booking.court.court_complex.name,
                'bookedStartTime': booking.booked_start_time.isoformat(),
                'bookedEndTime': booking.booked_end_time.isoformat(),
                'totalPrice': float(booking.total_price),
                'bookingStatus': booking.booking_status,
                'createdAt': booking.created_at.isoformat()
            })
        
        return jsonify({'bookings': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@booking_bp.route('/<int:booking_id>', methods=['GET'])
@jwt_required()
def get_booking_detail(booking_id):
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        booking = db.session.query(Booking).join(Court).join(CourtComplex).filter(
            Booking.id == booking_id
        ).first()
        
        if not booking:
            return jsonify({'error': 'Đơn đặt không tồn tại'}), 404
        
        # Check permission
        if user.role == 'Customer' and booking.booker_user_id != current_user_id:
            return jsonify({'error': 'Không có quyền truy cập'}), 403
        elif user.role == 'Owner' and booking.court.court_complex.owner_user_id != current_user_id:
            return jsonify({'error': 'Không có quyền truy cập'}), 403
        
        # Get booking products
        booking_products = BookingProduct.query.filter_by(booking_id=booking_id).all()
        
        # Get payment info for customers
        payment_info = None
        if user.role == 'Customer':
            complex = booking.court.court_complex
            payment_info = {
                'bankCode': complex.bank_code,
                'accountNumber': complex.account_number,
                'accountName': complex.account_name,
                'amount': float(booking.total_price),
                'content': f'TT don hang {booking.id}'
            }
        
        return jsonify({
            'id': booking.id,
            'bookerName': booking.booker.full_name,
            'bookerEmail': booking.booker.email,
            'courtName': booking.court.name,
            'complexName': booking.court.court_complex.name,
            'bookedStartTime': booking.booked_start_time.isoformat(),
            'bookedEndTime': booking.booked_end_time.isoformat(),
            'totalPrice': float(booking.total_price),
            'bookingStatus': booking.booking_status,
            'createdAt': booking.created_at.isoformat(),
            'products': [{
                'id': bp.id,
                'productName': bp.product.name,
                'quantity': bp.quantity,
                'unitPrice': float(bp.unit_price_at_time_of_addition),
                'subtotal': float(bp.subtotal)
            } for bp in booking_products],
            'paymentInfo': payment_info
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@booking_bp.route('/<int:booking_id>/confirm', methods=['PUT'])
@jwt_required()
def confirm_booking(booking_id):
    try:
        if not owner_required():
            return jsonify({'error': 'Không có quyền truy cập'}), 403
        
        current_user_id = get_jwt_identity()
        
        booking = db.session.query(Booking).join(Court).join(CourtComplex).filter(
            Booking.id == booking_id,
            CourtComplex.owner_user_id == current_user_id
        ).first()
        
        if not booking:
            return jsonify({'error': 'Đơn đặt không tồn tại'}), 404
        
        if booking.booking_status != 1:
            return jsonify({'error': 'Đơn đặt không ở trạng thái chờ xác nhận'}), 400
        
        booking.booking_status = 2  # Confirmed
        db.session.commit()
        
        return jsonify({'message': 'Xác nhận đơn đặt thành công'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@booking_bp.route('/<int:booking_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_booking(booking_id):
    try:
        if not owner_required():
            return jsonify({'error': 'Không có quyền truy cập'}), 403
        
        current_user_id = get_jwt_identity()
        
        booking = db.session.query(Booking).join(Court).join(CourtComplex).filter(
            Booking.id == booking_id,
            CourtComplex.owner_user_id == current_user_id
        ).first()
        
        if not booking:
            return jsonify({'error': 'Đơn đặt không tồn tại'}), 404
        
        if booking.booking_status not in [1, 2]:
            return jsonify({'error': 'Không thể hủy đơn đặt này'}), 400
        
        booking.booking_status = 3  # Cancelled
        db.session.commit()
        
        return jsonify({'message': 'Hủy đơn đặt thành công'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@booking_bp.route('/<int:booking_id>/products', methods=['POST'])
@jwt_required()
def add_booking_product(booking_id):
    try:
        if not owner_required():
            return jsonify({'error': 'Không có quyền truy cập'}), 403
        
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        booking = db.session.query(Booking).join(Court).join(CourtComplex).filter(
            Booking.id == booking_id,
            CourtComplex.owner_user_id == current_user_id
        ).first()
        
        if not booking:
            return jsonify({'error': 'Đơn đặt không tồn tại'}), 404
        
        product = Product.query.get(data['productId'])
        if not product:
            return jsonify({'error': 'Sản phẩm không tồn tại'}), 404
        
        quantity = data['quantity']
        subtotal = product.unit_price * quantity
        
        # Check if product already exists in booking
        existing_bp = BookingProduct.query.filter_by(
            booking_id=booking_id,
            product_id=product.id
        ).first()
        
        if existing_bp:
            existing_bp.quantity += quantity
            existing_bp.subtotal += subtotal
        else:
            new_bp = BookingProduct(
                booking_id=booking_id,
                product_id=product.id,
                quantity=quantity,
                unit_price_at_time_of_addition=product.unit_price,
                subtotal=subtotal
            )
            db.session.add(new_bp)
        
        # Update booking total price
        total_products_price = db.session.query(db.func.sum(BookingProduct.subtotal)).filter_by(
            booking_id=booking_id
        ).scalar() or 0
        
        # Calculate original court price
        duration_hours = (booking.booked_end_time - booking.booked_start_time).total_seconds() / 3600
        day_of_week = booking.booked_start_time.weekday() + 1
        
        rate = HourlyPriceRate.query.filter(
            HourlyPriceRate.court_id == booking.court_id,
            HourlyPriceRate.start_time <= booking.booked_start_time.time(),
            HourlyPriceRate.end_time > booking.booked_start_time.time(),
            (HourlyPriceRate.day_of_week == day_of_week) | (HourlyPriceRate.day_of_week.is_(None))
        ).first()
        
        court_price = Decimal(str(rate.price_per_hour)) * Decimal(str(duration_hours)) if rate else 0
        booking.total_price = court_price + total_products_price
        
        db.session.commit()
        
        return jsonify({'message': 'Thêm sản phẩm thành công'}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@booking_bp.route('/pending', methods=['GET'])
@jwt_required()
def get_pending_bookings():
    try:
        if not owner_required():
            return jsonify({'error': 'Không có quyền truy cập'}), 403
        
        current_user_id = get_jwt_identity()
        
        bookings = db.session.query(Booking).join(Court).join(CourtComplex).filter(
            CourtComplex.owner_user_id == current_user_id,
            Booking.booking_status == 1
        ).order_by(Booking.created_at.desc()).all()
        
        result = []
        for booking in bookings:
            result.append({
                'id': booking.id,
                'bookerName': booking.booker.full_name,
                'bookerEmail': booking.booker.email,
                'courtName': booking.court.name,
                'complexName': booking.court.court_complex.name,
                'bookedStartTime': booking.booked_start_time.isoformat(),
                'bookedEndTime': booking.booked_end_time.isoformat(),
                'totalPrice': float(booking.total_price),
                'createdAt': booking.created_at.isoformat()
            })
        
        return jsonify({'bookings': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

