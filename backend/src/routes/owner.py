from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.database import db, User, CourtComplex, Court, HourlyPriceRate, Amenity, CourtComplexAmenity, CourtComplexImage, SportType, Booking
from src.services.cloudinary_service import CloudinaryService
from datetime import datetime, timedelta
import src.services.email_service as email_service_module # Import email service
from sqlalchemy import func, cast 
import json

owner_bp = Blueprint('owner', __name__)

@owner_bp.route('/setup-status', methods=['GET'])
@jwt_required()
def get_setup_status():
    """Check if owner has completed setup"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        # Check if owner has any court complexes
        complexes = CourtComplex.query.filter_by(ownerId=user_id).all()
        
        # New variable name: hasCourtComplex
        if not complexes:
            return jsonify({
                'hasCourtComplex': False, # <<< THAY needsSetup BẰNG hasCourtComplex
                'setupStep': 'create_complex',
                'message': 'Bạn cần tạo khu phức hợp sân đầu tiên để bắt đầu kinh doanh.'
            })
        
        # If there are complexes, assume 'hasCourtComplex' is True.
        # Now, check for completion of details within those complexes.
        
        for complex_item in complexes: # Đổi tên biến 'complex' thành 'complex_item' để tránh xung đột với built-in type
            # Check if any complex needs courts/pricing
            courts = Court.query.filter_by(complexId=complex_item.id).all()
            if not courts:
                return jsonify({
                    'hasCourtComplex': True, # <<< Đã có complex, nhưng chưa hoàn chỉnh
                    'setupStep': 'complete_complex',
                    'complexId': complex_item.id,
                    'message': f'Khu phức hợp "{complex_item.name}" cần được hoàn thiện thông tin sân và giá cả.'
                })
            
            # Check if courts have pricing
            for court in courts:
                rates = HourlyPriceRate.query.filter_by(courtId=court.id).all()
                if not rates:
                    return jsonify({
                        'hasCourtComplex': True, # <<< Đã có complex, sân, nhưng chưa có giá
                        'setupStep': 'complete_complex',
                        'complexId': complex_item.id,
                        'message': f'Sân "{court.name}" cần được thiết lập giá theo khung giờ.'
                    })
        
        # If all checks pass, means setup is complete
        return jsonify({
            'hasCourtComplex': True, # <<< Đã hoàn thành
            'message': 'Thiết lập đã hoàn tất.'
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc() # Print full traceback for debugging
        return jsonify({'error': str(e)}), 500

@owner_bp.route('/setup-data', methods=['GET'])
@jwt_required()
def get_setup_data():
    """Get data needed for setup"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        # Get sport types
        sport_types = SportType.query.all()
        sport_types_data = [{'id': st.id, 'name': st.name} for st in sport_types]
        
        # Get amenities
        amenities = Amenity.query.all()
        amenities_data = [{'id': a.id, 'name': a.name, 'icon': a.icon} for a in amenities]
        
        # Common cities in Vietnam
        cities = [
            'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
            'Biên Hòa', 'Huế', 'Nha Trang', 'Buôn Ma Thuột', 'Quy Nhon',
            'Vũng Tàu', 'Nam Định', 'Phan Thiết', 'Long Xuyên', 'Hạ Long'
        ]
        
        return jsonify({
            'sportTypes': sport_types_data,
            'amenities': amenities_data,
            'cities': cities
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@owner_bp.route('/court-complexes', methods=['POST'])
@jwt_required()
def create_court_complex():
    """Create a new court complex with courts and pricing"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'address', 'city', 'phoneNumber', 'sportType', 'openTime', 'closeTime']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create court complex
        new_complex = CourtComplex( # <<< ĐÂY LÀ BIẾN ĐÚNG
            ownerId=user_id,
            name=data['name'],
            address=data['address'],
            city=data['city'],
            description=data.get('description', ''),
            phoneNumber=data['phoneNumber'],
            sportType=data['sportType'],
            googleMapLink=data.get('googleMapLink', ''),
            bankCode=data.get('bankCode', ''), # Thêm các trường này
            accountNumber=data.get('accountNumber', ''), # Thêm các trường này
            accountName=data.get('accountName', ''), # Thêm các trường này
            openTime=datetime.strptime(data.get('openTime', '06:00'), '%H:%M').time(),
            closeTime=datetime.strptime(data.get('closeTime', '22:00'), '%H:%M').time(),
            status='Active'
        )
        
        db.session.add(new_complex)
        db.session.flush()  # Ghi vào DB để new_complex.id có giá trị
        
        # Handle images upload
        if data.get('images'):
            main_image_set = False
            for i, image_data in enumerate(data['images']):
                # Upload to Cloudinary
                upload_result = CloudinaryService.upload_image(
                    image_data, 
                    folder=f"court-complexes/{new_complex.id}" # <<< SỬ DỤNG new_complex.id
                )
                
                if upload_result['success']:
                    is_main = i == data.get('mainImageIndex', 0) or not main_image_set
                    
                    complex_image = CourtComplexImage(
                        complexId=new_complex.id, # <<< SỬ DỤNG new_complex.id
                        imageUrl=upload_result['url'],
                        publicId=upload_result['public_id'],
                        isMain=is_main
                    )
                    db.session.add(complex_image)
                    
                    # Set main image URL in complex
                    if is_main:
                        new_complex.mainImage = upload_result['url'] # <<< SỬ DỤNG new_complex.mainImage
                        main_image_set = True
        
        # Add amenities
        if data.get('amenities'):
            for amenity_id in data['amenities']:
                complex_amenity = CourtComplexAmenity(
                    complexId=new_complex.id, # <<< SỬ DỤNG new_complex.id
                    amenityId=amenity_id
                )
                db.session.add(complex_amenity)
        
        # Create courts
        if data.get('courts'):
            for court_data in data['courts']:
                court = Court(
                    complexId=new_complex.id, # <<< SỬ DỤNG new_complex.id
                    name=court_data['name'],
                    status='Active'
                )
                db.session.add(court)
                db.session.flush()  # Ghi vào DB để court.id có giá trị
                
                # Create hourly price rates
                if court_data.get('pricing'): # <<< ĐÚNG RỒI: court_data['pricing']
                    for price_data_item in court_data['pricing']: # <<< SỬA CHỖ NÀY: price_data_item thay vì price_data
                        rate = HourlyPriceRate(
                            courtId=court.id,
                            dayOfWeek=price_data_item.get('dayOfWeek', 'All'),
                            startTime=datetime.strptime(price_data_item['startTime'], '%H:%M').time(),
                            endTime=datetime.strptime(price_data_item['endTime'], '%H:%M').time(),
                            price=float(price_data_item['price'])
                        )
                        db.session.add(rate)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Court complex created successfully',
            'complexId': new_complex.id # <<< SỬ DỤNG new_complex.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc() # In traceback ra console của server để debug
        return jsonify({'error': str(e)}), 500

@owner_bp.route('/court-complexes', methods=['GET'])
@jwt_required()
def get_court_complexes():
    """Get owner's court complexes"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        complexes = CourtComplex.query.filter_by(ownerId=user_id).all()
        
        complexes_data = []
        for complex in complexes:
            # Get court count
            court_count = Court.query.filter_by(complexId=complex.id).count()
            
            # Get monthly bookings and revenue (current month)
            current_month = datetime.now().month
            current_year = datetime.now().year
            
            monthly_bookings = db.session.query(Booking).join(Court).filter(
                Court.complexId == complex.id,
                db.extract('month', Booking.createdAt) == current_month,
                db.extract('year', Booking.createdAt) == current_year,
                Booking.status.in_(['Confirmed', 'Completed'])
            ).count()
            
            monthly_revenue = db.session.query(db.func.sum(Booking.totalPrice)).join(Court).filter(
                Court.complexId == complex.id,
                db.extract('month', Booking.createdAt) == current_month,
                db.extract('year', Booking.createdAt) == current_year,
                Booking.status.in_(['Confirmed', 'Completed'])
            ).scalar() or 0
            
            complexes_data.append({
                'id': complex.id,
                'name': complex.name,
                'address': complex.address,
                'city': complex.city,
                'sportType': complex.sportType,
                'phoneNumber': complex.phoneNumber,
                'openTime': complex.openTime.strftime('%H:%M') if complex.openTime else None,  # <<< SỬ DỤNG .strftime()
                'closeTime': complex.closeTime.strftime('%H:%M') if complex.closeTime else None, # <<< SỬ DỤNG .strftime()
                'mainImage': complex.mainImage,
                'rating': float(complex.rating) if complex.rating else 0,
                'totalReviews': complex.totalReviews,
                'status': complex.status,
                'courtCount': court_count,
                'monthlyBookings': monthly_bookings,
                'monthlyRevenue': float(monthly_revenue)
            })
        
        return jsonify({'courtComplexes': complexes_data})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@owner_bp.route('/statistics', methods=['GET'])
@jwt_required()
def get_statistics():
    """Get owner statistics"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        # Get total complexes (already correct)
        total_complexes = CourtComplex.query.filter_by(ownerId=user_id).count()
        
        # Get total courts (already correct)
        total_courts = db.session.query(Court).join(CourtComplex).filter(
            CourtComplex.ownerId == user_id
        ).count()
        
        # --- THỐNG KÊ THEO THÁNG HIỆN TẠI ---
        # Lấy ngày đầu tiên và cuối cùng của tháng hiện tại
        today = datetime.now()
        first_day_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Tính ngày cuối tháng (cách đơn giản: tháng sau - 1 ngày)
        if today.month == 12:
            last_day_of_month = today.replace(year=today.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(microseconds=1)
        else:
            last_day_of_month = today.replace(month=today.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(microseconds=1)
        
        # Monthly Bookings
        monthly_bookings_query = db.session.query(Booking).join(Court).join(CourtComplex).filter(
            CourtComplex.ownerId == user_id,
            Booking.createdAt >= first_day_of_month,
            Booking.createdAt <= last_day_of_month,
            Booking.status.in_(['Confirmed', 'Completed']) # Chỉ tính các booking đã xác nhận/hoàn thành
        )
        monthly_bookings = monthly_bookings_query.count()
        
        # Monthly Revenue
        monthly_revenue_query = db.session.query(func.sum(Booking.totalPrice)).join(Court).join(CourtComplex).filter(
            CourtComplex.ownerId == user_id,
            Booking.createdAt >= first_day_of_month,
            Booking.createdAt <= last_day_of_month,
            Booking.status.in_(['Confirmed', 'Completed'])
        )
        monthly_revenue = monthly_revenue_query.scalar() or 0.0 # Đảm bảo là float/Decimal
        
        # Tỷ lệ lấp đầy (Occupancy Rate)
        # Đây là phần phức tạp nhất, cần dữ liệu chi tiết hơn về court complex và courts
        # Tạm thời tính một cách đơn giản, nếu không có dữ liệu chi tiết hơn
        # Để tính chính xác, cần: tổng số giờ sân có thể đặt trong tháng / tổng số giờ đã được đặt
        # Cách đơn giản: nếu có booking, tạm coi là có % lấp đầy nhỏ
        occupancy_rate = 0.0
        if total_courts > 0:
            # Đây chỉ là một ước lượng rất thô.
            # Để chính xác, cần tính tổng số giờ có sẵn (total_courts * total_hours_in_month)
            # và tổng số giờ đã đặt (sum of duration of confirmed bookings).
            # Tạm thời, nếu có booking, giả định có một tỷ lệ nhất định.
            # Hoặc chỉ tính nếu có monthly_bookings > 0
            if monthly_bookings > 0 and total_courts > 0:
                # Giả định trung bình mỗi booking là 1 giờ.
                # Tổng giờ đặt = monthly_bookings * 1 giờ.
                # Tổng giờ có sẵn = total_courts * (số giờ hoạt động trung bình mỗi ngày) * (số ngày trong tháng)
                
                # Để có một con số thực tế, bạn cần một logic phức tạp hơn:
                # 1. Lấy giờ mở/đóng cửa của tất cả các khu phức hợp của owner.
                # 2. Tính tổng số giờ "có thể đặt" cho tất cả các sân trong tháng đó.
                # 3. Tính tổng số giờ "đã được đặt" từ các booking Confirmed/Completed.
                # Đây là một con số giả định tạm thời:
                occupancy_rate = (monthly_bookings / (total_courts * 30 * 10)) * 100 # Giả định 10 giờ/ngày * 30 ngày
                occupancy_rate = min(occupancy_rate, 100.0) # Không vượt quá 100%
                occupancy_rate = round(occupancy_rate, 1) # Làm tròn 1 chữ số thập phân
            else:
                occupancy_rate = 0.0


        return jsonify({
            'overview': {
                'totalComplexes': total_complexes,
                'totalCourts': total_courts,
                'monthlyBookings': monthly_bookings,
                'monthlyRevenue': float(monthly_revenue), # Đảm bảo là float khi trả về
                'occupancyRate': occupancy_rate
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@owner_bp.route('/bookings', methods=['GET'])
@jwt_required()
def get_bookings():
    """
    Get owner's bookings with pagination, sorting, and filtering.
    Query Params:
        page (int): Current page number (default: 1)
        limit (int): Items per page (default: 10)
        sortBy (str): Field to sort by (e.g., 'createdAt', 'startTime', 'customerName', 'totalPrice', 'status')
        sortOrder (str): 'asc' or 'desc' (default: 'desc')
        status (str): Filter by booking status (e.g., 'Pending', 'Confirmed', 'Completed', 'Rejected', 'Cancelled')
        courtComplexId (int): Filter by a specific court complex
        date (str): Filter by a specific date (YYYY-MM-DD)
        search (str): Search by customer name, email, or phone
    """
    try:
        user_id = get_jwt_identity()
        owner_user = User.query.get(user_id)
        
        if not owner_user or owner_user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        # Lấy query parameters
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        sort_by = request.args.get('sortBy', 'createdAt')
        sort_order = request.args.get('sortOrder', 'desc')
        filter_status = request.args.get('status')
        filter_complex_id = request.args.get('courtComplexId', type=int)
        filter_date_str = request.args.get('date')
        search_query = request.args.get('search')
        
        # Bắt đầu truy vấn với joined loads
        bookings_query = db.session.query(Booking).options(
            db.joinedload(Booking.customer),
            db.joinedload(Booking.court).joinedload(Court.complex)
        ).join(Court).join(CourtComplex).filter(
            CourtComplex.ownerId == user_id # Chỉ lấy booking của owner này
        )

        # Lọc theo trạng thái
        if filter_status and filter_status in ['Pending', 'Confirmed', 'Completed', 'Rejected', 'Cancelled']:
            bookings_query = bookings_query.filter(Booking.status == filter_status)

        # Lọc theo khu phức hợp
        if filter_complex_id:
            bookings_query = bookings_query.filter(CourtComplex.id == filter_complex_id)

        # Lọc theo ngày
        if filter_date_str:
            try:
                filter_date = datetime.strptime(filter_date_str, '%Y-%m-%d').date()
                bookings_query = bookings_query.filter(
                    db.func.date(Booking.startTime) == filter_date # Lọc theo phần ngày của startTime
                )
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD.'}), 400

        # Tìm kiếm
        if search_query:
            search_pattern = f"%{search_query}%"
            # Cần xử lý tìm kiếm trên User.fullName, User.email an toàn
            # và trên walkInCustomerName, walkInCustomerPhone
            search_conditions = [
                Booking.walkInCustomerName.ilike(search_pattern),
                Booking.walkInCustomerPhone.ilike(search_pattern),
                db.and_(
                    Booking.customerId.isnot(None), # Chỉ tìm user đã đăng ký
                    db.or_(
                        Booking.customer.has(User.fullName.ilike(search_pattern)),
                        Booking.customer.has(User.email.ilike(search_pattern)),
                        # Thêm dòng này nếu User model có phoneNumber và bạn muốn tìm kiếm theo số điện thoại của user đã đăng ký
                        # Booking.customer.has(User.phoneNumber.ilike(search_pattern)), 
                    )
                )
            ]
            bookings_query = bookings_query.filter(db.or_(*search_conditions))


        # Sắp xếp
        if sort_by:
            # Ánh xạ tên cột từ frontend sang các thuộc tính model
            sort_columns = {
                'createdAt': Booking.createdAt,
                'startTime': Booking.startTime,
                'totalPrice': Booking.totalPrice,
                'status': Booking.status,
                'customerName': func.coalesce(User.fullName, Booking.walkInCustomerName), # Cần join User model để sắp xếp trên fullName
                'courtName': Court.name,
                'complexName': CourtComplex.name,
            }
            
            sort_column = sort_columns.get(sort_by)
            if sort_column is not None: # Kiểm tra không phải None để tránh lỗi
                # Nếu sắp xếp theo customerName, cần đảm bảo join User model
                if sort_by == 'customerName':
                    bookings_query = bookings_query.outerjoin(User, Booking.customerId == User.id) # Outerjoin User
                
                if sort_order == 'asc':
                    bookings_query = bookings_query.order_by(sort_column.asc())
                else:
                    bookings_query = bookings_query.order_by(sort_column.desc())
            else:
                # Mặc định sắp xếp nếu sortBy không hợp lệ
                bookings_query = bookings_query.order_by(Booking.createdAt.desc())
        else:
            bookings_query = bookings_query.order_by(Booking.createdAt.desc())


        # Thực hiện phân trang
        paginated_bookings = bookings_query.paginate(page=page, per_page=limit, error_out=False)
        
        bookings_data = []
        for booking in paginated_bookings.items:
            customer_email = ''
            customer_phone = ''
            customer_full_name = ''

            if booking.customerId: # Booking từ người dùng đã đăng ký
                customer = booking.customer 
                if customer:
                    customer_full_name = customer.fullName
                    customer_email = customer.email
                    customer_phone = getattr(customer, 'phoneNumber', '') # Lấy phoneNumber an toàn
                else: # Fallback nếu customerId có nhưng user không tìm thấy
                    customer_full_name = 'Người dùng không tồn tại'
                    customer_email = ''
                    customer_phone = ''
            else: # Booking từ khách vãng lai
                customer_full_name = booking.walkInCustomerName
                customer_email = '' 
                customer_phone = booking.walkInCustomerPhone
            
            bookings_data.append({
                'id': booking.id,
                'customerName': customer_full_name,
                'customerEmail': customer_email,
                'customerPhone': customer_phone,
                'courtName': booking.court.name,
                'complexName': booking.court.complex.name,
                'startTime': booking.startTime.isoformat(),
                'endTime': booking.endTime.isoformat(),
                'totalPrice': float(booking.totalPrice),
                'status': booking.status,
                'bookingType': booking.bookingType, # Đảm bảo trả về
                'createdAt': booking.createdAt.isoformat(),
                # Thêm Complex address/city cho modal chi tiết
                'complexAddress': booking.court.complex.address,
                'complexCity': booking.court.complex.city,
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



@owner_bp.route('/court-complexes/<int:complex_id>', methods=['GET'])
@jwt_required()
def get_court_complex(complex_id):
    """Get single court complex details"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        complex = CourtComplex.query.filter_by(id=complex_id, ownerId=user_id).first()
        if not complex:
            return jsonify({'error': 'Court complex not found'}), 404
        
        # Get amenities
        amenities = db.session.query(Amenity).join(CourtComplexAmenity).filter(
            CourtComplexAmenity.complexId == complex_id
        ).all()
        amenity_ids = [a.id for a in amenities]
        
        # Get images
        images = CourtComplexImage.query.filter_by(complexId=complex_id).all()
        image_urls = [img.imageUrl for img in images]
        
        # Find main image index
        main_image_index = 0
        if complex.mainImage and complex.mainImage in image_urls:
            main_image_index = image_urls.index(complex.mainImage)
        
        complex_data = {
            'id': complex.id,
            'name': complex.name,
            'address': complex.address,
            'city': complex.city,
            'description': complex.description,
            'phoneNumber': complex.phoneNumber,
            'sportType': complex.sportType,
            'googleMapLink': complex.googleMapLink,
            'bankCode': complex.bankCode,
            'accountNumber': complex.accountNumber,
            'accountName': complex.accountName,
            'openTime': complex.openTime.strftime('%H:%M') if complex.openTime else '06:00',
            'closeTime': complex.closeTime.strftime('%H:%M') if complex.closeTime else '22:00',
            'amenities': amenity_ids,
            'images': image_urls,
            'mainImageIndex': main_image_index,
            'mainImage': complex.mainImage,
            'rating': float(complex.rating) if complex.rating else 0,
            'totalReviews': complex.totalReviews,
            'status': complex.status
        }
        
        return jsonify(complex_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@owner_bp.route('/court-complexes/<int:complex_id>', methods=['PUT'])
@jwt_required()
def update_court_complex(complex_id):
    """Update court complex"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        complex = CourtComplex.query.filter_by(id=complex_id, ownerId=user_id).first()
        if not complex:
            return jsonify({'error': 'Court complex not found'}), 404
        
        data = request.get_json()
        
        # Update basic info
        complex.name = data.get('name', complex.name)
        complex.address = data.get('address', complex.address)
        complex.city = data.get('city', complex.city)
        complex.description = data.get('description', complex.description)
        complex.phoneNumber = data.get('phoneNumber', complex.phoneNumber)
        complex.sportType = data.get('sportType', complex.sportType)
        complex.googleMapLink = data.get('googleMapLink', complex.googleMapLink)
        complex.bankCode = data.get('bankCode', complex.bankCode)
        complex.accountNumber = data.get('accountNumber', complex.accountNumber)
        complex.accountName = data.get('accountName', complex.accountName)
        
        # Update times
        if data.get('openTime'):
            complex.openTime = datetime.strptime(data['openTime'], '%H:%M').time()
        if data.get('closeTime'):
            complex.closeTime = datetime.strptime(data['closeTime'], '%H:%M').time()
        
        # Handle images
        if 'images' in data:
            # Delete old images
            old_images = CourtComplexImage.query.filter_by(complexId=complex_id).all()
            for img in old_images:
                # Delete from Cloudinary
                CloudinaryService.delete_image(img.imageUrl)
                db.session.delete(img)
            
            # Upload new images
            image_urls = []
            for image_data in data['images']:
                if image_data.startswith('data:image'):
                    # Upload to Cloudinary
                    upload_result = CloudinaryService.upload_image(image_data)
                    if upload_result:
                        image_urls.append(upload_result['secure_url'])
                        # Save to database
                        new_image = CourtComplexImage(
                            complexId=complex_id,
                            imageUrl=upload_result['secure_url']
                        )
                        db.session.add(new_image)
                else:
                    # Existing image URL
                    image_urls.append(image_data)
            
            # Set main image
            main_image_index = data.get('mainImageIndex', 0)
            if image_urls and main_image_index < len(image_urls):
                complex.mainImage = image_urls[main_image_index]
        
        # Handle amenities
        if 'amenities' in data:
            # Delete old amenities
            CourtComplexAmenity.query.filter_by(complexId=complex_id).delete()
            
            # Add new amenities
            for amenity_id in data['amenities']:
                new_amenity = CourtComplexAmenity(
                    complexId=complex_id,
                    amenityId=amenity_id
                )
                db.session.add(new_amenity)
        
        db.session.commit()
        
        return jsonify({'message': 'Court complex updated successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@owner_bp.route('/court-complexes/<int:complex_id>/courts', methods=['GET'])
@jwt_required()
def get_complex_courts(complex_id):
    """Get courts for a specific complex"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        # Verify ownership
        complex = CourtComplex.query.filter_by(id=complex_id, ownerId=user_id).first()
        if not complex:
            return jsonify({'error': 'Court complex not found'}), 404
        
        courts = Court.query.filter_by(complexId=complex_id).all()
        
        courts_data = []
        for court in courts:
            # Get pricing
            pricing = HourlyPriceRate.query.filter_by(courtId=court.id).all()
            pricing_data = []
            for rate in pricing:
                pricing_data.append({
                    'dayOfWeek': rate.dayOfWeek,
                    'startTime': rate.startTime.strftime('%H:%M') if rate.startTime else '06:00',
                    'endTime': rate.endTime.strftime('%H:%M') if rate.endTime else '22:00',
                    'price': float(rate.price)
                })
            
            courts_data.append({
                'id': court.id,
                'name': court.name,
                'status': court.status,
                'pricing': pricing_data
            })
        
        return jsonify({'courts': courts_data})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@owner_bp.route('/court-complexes/<int:complex_id>/courts', methods=['POST'])
@jwt_required()
def create_court(complex_id):
    """Create a new court"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        # Verify ownership
        complex = CourtComplex.query.filter_by(id=complex_id, ownerId=user_id).first()
        if not complex:
            return jsonify({'error': 'Court complex not found'}), 404
        
        data = request.get_json()
        
        # Create court
        new_court = Court(
            complexId=complex_id,
            name=data['name'],
            status='Active'
        )
        db.session.add(new_court)
        db.session.flush()  # Get the court ID
        
        # Create pricing
        for pricing_data in data.get('pricing', []):
            new_rate = HourlyPriceRate(
                courtId=new_court.id,
                dayOfWeek=pricing_data['dayOfWeek'],
                startTime=datetime.strptime(pricing_data['startTime'], '%H:%M').time(),
                endTime=datetime.strptime(pricing_data['endTime'], '%H:%M').time(),
                price=pricing_data['price']
            )
            db.session.add(new_rate)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Court created successfully',
            'court': {
                'id': new_court.id,
                'name': new_court.name,
                'status': new_court.status
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@owner_bp.route('/courts/<int:court_id>', methods=['PUT'])
@jwt_required()
def update_court(court_id):
    """Update court"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        # Verify ownership through complex
        court = db.session.query(Court).join(CourtComplex).filter(
            Court.id == court_id,
            CourtComplex.ownerId == user_id
        ).first()
        
        if not court:
            return jsonify({'error': 'Court not found'}), 404
        
        data = request.get_json()
        
        # Update court
        court.name = data.get('name', court.name)
        court.status = data.get('status', court.status)
        
        # Update pricing
        if 'pricing' in data:
            # Delete old pricing
            HourlyPriceRate.query.filter_by(courtId=court_id).delete()
            
            # Add new pricing
            for pricing_data in data['pricing']:
                new_rate = HourlyPriceRate(
                    courtId=court_id,
                    dayOfWeek=pricing_data['dayOfWeek'],
                    startTime=datetime.strptime(pricing_data['startTime'], '%H:%M').time(),
                    endTime=datetime.strptime(pricing_data['endTime'], '%H:%M').time(),
                    price=pricing_data['price']
                )
                db.session.add(new_rate)
        
        db.session.commit()
        
        return jsonify({'message': 'Court updated successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@owner_bp.route('/courts/<int:court_id>', methods=['DELETE'])
@jwt_required()
def delete_court(court_id):
    """Delete court"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        # Verify ownership through complex
        court = db.session.query(Court).join(CourtComplex).filter(
            Court.id == court_id,
            CourtComplex.ownerId == user_id
        ).first()
        
        if not court:
            return jsonify({'error': 'Court not found'}), 404
        
        # Check if court has any bookings
        booking_count = Booking.query.filter_by(courtId=court_id).count()
        if booking_count > 0:
            return jsonify({'error': 'Cannot delete court with existing bookings'}), 400
        
        # Delete pricing first
        HourlyPriceRate.query.filter_by(courtId=court_id).delete()
        
        # Delete court
        db.session.delete(court)
        db.session.commit()
        
        return jsonify({'message': 'Court deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@owner_bp.route('/bookings/<int:booking_id>/approve', methods=['PUT'])
@jwt_required()
def approve_booking(booking_id):
    """Approve a pending booking"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        # Verify ownership and load customer, court, complex
        booking = db.session.query(Booking).options(
            db.joinedload(Booking.customer),
            db.joinedload(Booking.court).joinedload(Court.complex)
        ).filter(
            Booking.id == booking_id,
            Booking.court.has(Court.complex.has(ownerId=user_id)) # Cách hiệu quả hơn để kiểm tra sở hữu
        ).first()
        
        if not booking:
            return jsonify({'error': 'Booking not found or not owned by you'}), 404
        
        if booking.status != 'Pending':
            return jsonify({'error': 'Only pending bookings can be approved'}), 400
        
        booking.status = 'Confirmed'
        db.session.commit()
        
        # Send status update email to customer
        customer = booking.customer # Đã được loaded
        court = booking.court # Đã được loaded
        complex = court.complex # Đã được loaded

        if customer and customer.email: # Chỉ gửi nếu có email
            try:
                email_service_module.EmailService.send_booking_status_update_to_customer( # <<< GỌI HÀM MỚI
                    customer.email,
                    customer.fullName,
                    {
                        'id': booking.id,
                        'courtName': court.name,
                        'complexName': complex.name,
                        'startTime': booking.startTime.isoformat(), # Sử dụng isoformat cho email service
                        'endTime': booking.endTime.isoformat(),     # Sử dụng isoformat cho email service
                        'totalPrice': float(booking.totalPrice),
                        'status': 'Confirmed'
                    },
                    new_status='Confirmed',
                    reason=None # Không có lý do cho việc duyệt
                )
            except Exception as e:
                print(f"Failed to send approval email: {e}")
                import traceback
                traceback.print_exc()
        
        return jsonify({'message': 'Booking approved successfully'})
        
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@owner_bp.route('/bookings/<int:booking_id>/reject', methods=['PUT'])
@jwt_required()
def reject_booking(booking_id):
    """Reject a pending booking"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        # Verify ownership and load customer, court, complex
        booking = db.session.query(Booking).options(
            db.joinedload(Booking.customer),
            db.joinedload(Booking.court).joinedload(Court.complex)
        ).filter(
            Booking.id == booking_id,
            CourtComplex.ownerId == user_id # Có thể dùng CourtComplex.ownerId == user_id trực tiếp
        ).first()
        
        if not booking:
            return jsonify({'error': 'Booking not found or not owned by you'}), 404
        
        if booking.status != 'Pending':
            return jsonify({'error': 'Only pending bookings can be rejected'}), 400
        
        data = request.get_json() # <<< VẪN LẤY BODY DỮ LIỆU
        reason = data.get('reason', 'Không có lý do được cung cấp.') # Có lý do mặc định cho trường hợp không có lý do được gửi lên
        
        booking.status = 'Rejected' # <<< CẬP NHẬT TRẠNG THÁI LÀ 'Rejected'
        db.session.commit()
        
        # Send status update email to customer
        customer = booking.customer # Đã được loaded
        court = booking.court # Đã được loaded
        complex = court.complex # Đã được loaded

        if customer and customer.email: # Chỉ gửi nếu có email
            try:
                email_service_module.EmailService.send_booking_status_update_to_customer( # <<< GỌI HÀM MỚI
                    customer.email,
                    customer.fullName,
                    {
                        'id': booking.id,
                        'courtName': court.name,
                        'complexName': complex.name,
                        'startTime': booking.startTime.isoformat(), # Sử dụng isoformat cho email service
                        'endTime': booking.endTime.isoformat(),     # Sử dụng isoformat cho email service
                        'totalPrice': float(booking.totalPrice),
                        'status': 'Rejected'
                    },
                    new_status='Rejected',
                    reason=reason # Truyền lý do từ chối vào email
                )
            except Exception as e:
                print(f"Failed to send rejection email: {e}")
                import traceback
                traceback.print_exc()
        
        return jsonify({'message': 'Booking rejected successfully'})
        
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@owner_bp.route('/bookings/pending', methods=['GET'])
@jwt_required()
def get_pending_bookings():
    """Get pending bookings for owner approval"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        pending_bookings = db.session.query(Booking).join(Court).join(CourtComplex).filter(
            CourtComplex.ownerId == user_id,
            Booking.status == 'Pending'
        ).order_by(Booking.createdAt.desc()).all()
        
        bookings_data = []
        for booking in pending_bookings:
            customer_info = {}
            if booking.customerId:
                customer = User.query.get(booking.customerId)
                customer_info = {
                    'fullName': customer.fullName,
                    'email': customer.email,
                    'phone': customer.phoneNumber if hasattr(customer, 'phoneNumber') else ''
                }
            else:
                customer_info = {
                    'fullName': booking.walkInCustomerName,
                    'email': '',
                    'phone': booking.walkInCustomerPhone
                }
            
            bookings_data.append({
                'id': booking.id,
                'customer': customer_info,
                'court': {
                    'name': booking.court.name,
                    'complex': booking.court.complex.name
                },
                'startTime': booking.startTime.isoformat(),
                'endTime': booking.endTime.isoformat(),
                'totalPrice': float(booking.totalPrice),
                'bookingType': booking.bookingType,
                'createdAt': booking.createdAt.isoformat()
            })
        
        return jsonify({'bookings': bookings_data})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@owner_bp.route('/banks', methods=['GET'])
def get_banks():
    """Get list of banks from VietQR API"""
    try:
        from src.services.bank_service import BankService
        
        result = BankService.get_banks()
        if result['success']:
            return jsonify({'banks': result['banks']})
        else:
            return jsonify({'error': result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@owner_bp.route('/court-complexes/<int:complex_id>/availability', methods=['GET'])
@jwt_required()
def get_court_availability(complex_id):
    """Get availability calendar for courts in a complex"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        # Verify ownership
        complex = CourtComplex.query.filter_by(id=complex_id, ownerId=user_id).first()
        if not complex:
            return jsonify({'error': 'Court complex not found'}), 404
        
        # Get date range from query params
        from datetime import datetime, timedelta
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date:
            start_date = datetime.now().date()
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            
        if not end_date:
            end_date = start_date + timedelta(days=7)
        else:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Get courts
        courts = Court.query.filter_by(complexId=complex_id, status='Active').all()
        
        # Get bookings in date range
        bookings = Booking.query.join(Court).filter(
            Court.complexId == complex_id,
            Booking.startTime >= datetime.combine(start_date, datetime.min.time()),
            Booking.endTime <= datetime.combine(end_date, datetime.max.time()),
            Booking.status.in_(['Pending', 'Confirmed'])
        ).all()
        
        # Build availability data
        availability_data = {}
        current_date = start_date
        
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            availability_data[date_str] = {}
            
            for court in courts:
                court_bookings = [b for b in bookings if b.courtId == court.id and b.startTime.date() == current_date]
                
                # Generate time slots (every 30 minutes from open to close)
                open_time = complex.openTime or datetime.strptime('06:00', '%H:%M').time()
                close_time = complex.closeTime or datetime.strptime('22:00', '%H:%M').time()
                
                slots = []
                current_time = datetime.combine(current_date, open_time)
                end_time = datetime.combine(current_date, close_time)
                
                while current_time < end_time:
                    slot_end = current_time + timedelta(minutes=30)
                    
                    # Check if this slot is booked
                    is_booked = any(
                        booking.startTime <= current_time < booking.endTime or
                        booking.startTime < slot_end <= booking.endTime or
                        (current_time <= booking.startTime and slot_end >= booking.endTime)
                        for booking in court_bookings
                    )
                    
                    slots.append({
                        'time': current_time.strftime('%H:%M'),
                        'available': not is_booked
                    })
                    
                    current_time = slot_end
                
                availability_data[date_str][court.id] = {
                    'courtName': court.name,
                    'slots': slots
                }
            
            current_date += timedelta(days=1)
        
        return jsonify({
            'complex': {
                'id': complex.id,
                'name': complex.name,
                'openTime': complex.openTime.strftime('%H:%M') if complex.openTime else '06:00',
                'closeTime': complex.closeTime.strftime('%H:%M') if complex.closeTime else '22:00'
            },
            'courts': [{'id': c.id, 'name': c.name} for c in courts],
            'availability': availability_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@owner_bp.route('/bookings/<int:booking_id>/cancel', methods=['PUT']) # HOẶC DELETE
@jwt_required()
def cancel_booking(booking_id):
    """Cancel a booking (Approved or Pending)"""
    try:
        user_id = get_jwt_identity()
        owner_user = User.query.get(user_id)

        if not owner_user or owner_user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        booking = db.session.query(Booking).options(
            db.joinedload(Booking.customer),
            db.joinedload(Booking.court).joinedload(Court.complex)
        ).filter(
            Booking.id == booking_id,
            Booking.court.has(Court.complex.has(ownerId=user_id))
        ).first()

        if not booking:
            return jsonify({'error': 'Booking not found or not owned by you'}), 404
        
        # Chỉ cho phép hủy nếu trạng thái là Pending hoặc Confirmed
        if booking.status not in ['Pending', 'Confirmed']:
            return jsonify({'error': 'Only pending or confirmed bookings can be cancelled'}), 400

        data = request.get_json() # Có thể có lý do hủy
        reason = data.get('reason', 'Đơn đặt sân đã bị hủy bởi chủ sân.')

        booking.status = 'Cancelled'
        # booking.cancellationReason = reason # Nếu bạn có trường này trong model Booking
        db.session.commit()

        # Gửi email thông báo hủy cho khách hàng
        if booking.customerId and booking.customer and booking.customer.email:
            customer = booking.customer
            court = booking.court
            complex = court.complex
            try:
                email_service_module.EmailService.send_booking_cancellation(
                    customer.email,
                    customer.fullName,
                    {
                        'id': booking.id,
                        'courtName': court.name,
                        'complexName': complex.name,
                        'startTime': booking.startTime.isoformat(),
                        'endTime': booking.endTime.isoformat(),
                        'totalPrice': float(booking.totalPrice),
                        'cancellationReason': reason # Truyền lý do hủy
                    }
                )
            except Exception as e:
                print(f"Failed to send cancellation email: {e}")
                import traceback
                traceback.print_exc()
        
        return jsonify({'message': 'Booking cancelled successfully'}), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
@owner_bp.route('/bookings/<int:booking_id>/complete', methods=['PUT'])
@jwt_required()
def mark_booking_completed(booking_id):
    """Mark a confirmed booking as completed (after customer has played)"""
    try:
        user_id = get_jwt_identity()
        owner_user = User.query.get(user_id)

        if not owner_user or owner_user.role != 'Owner':
            return jsonify({'error': 'Access denied'}), 403
        
        booking = db.session.query(Booking).options(
            db.joinedload(Booking.court).joinedload(Court.complex)
        ).filter(
            Booking.id == booking_id,
            Booking.court.has(Court.complex.has(ownerId=user_id))
        ).first()

        if not booking:
            return jsonify({'error': 'Booking not found or not owned by you'}), 404
        
        # Chỉ có thể hoàn thành booking ở trạng thái Confirmed
        if booking.status != 'Confirmed':
            return jsonify({'error': 'Only confirmed bookings can be marked as completed'}), 400
        
        # Optionally, check if current time is after booking end time
        if datetime.now() < booking.endTime:
            return jsonify({'error': 'Cannot mark booking as completed before its end time'}), 400

        booking.status = 'Completed'
        # Nếu có trường actual_end_time = datetime.now() thì có thể cập nhật
        db.session.commit()

        # Có thể gửi email thông báo hoặc log sự kiện nếu cần

        return jsonify({'message': 'Booking marked as completed successfully'}), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500