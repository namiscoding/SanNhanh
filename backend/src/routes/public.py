from flask import Blueprint, request, jsonify
from src.models.database import db, CourtComplex, Court, HourlyPriceRate, Booking, CourtComplexImage, Amenity, CourtComplexAmenity, Review
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_

public_bp = Blueprint('public', __name__, url_prefix='/public')

@public_bp.route('/court-complexes', methods=['GET'])
def get_court_complexes():
    """Get all active court complexes for public viewing"""
    try:
        # Get query parameters
        city = request.args.get('city')
        sport_type = request.args.get('sportType')
        search = request.args.get('search')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 12))
        
        # Build query
        query = CourtComplex.query.filter_by(status='Active')
        
        if city:
            query = query.filter(CourtComplex.city == city)
        
        if sport_type:
            query = query.filter(CourtComplex.sportType == sport_type)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    CourtComplex.name.ilike(search_term),
                    CourtComplex.address.ilike(search_term),
                    CourtComplex.description.ilike(search_term)
                )
            )
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * limit
        complexes = query.offset(offset).limit(limit).all()
        
        complexes_data = []
        for complex in complexes:
            # Get court count
            court_count = Court.query.filter_by(complexId=complex.id, status='Active').count()
            
            # Get price range
            min_price = db.session.query(func.min(HourlyPriceRate.price)).join(Court).filter(
                Court.complexId == complex.id,
                Court.status == 'Active'
            ).scalar() or 0
            
            max_price = db.session.query(func.max(HourlyPriceRate.price)).join(Court).filter(
                Court.complexId == complex.id,
                Court.status == 'Active'
            ).scalar() or 0
            
            # Get amenities
            amenities = db.session.query(Amenity.name).join(CourtComplexAmenity).filter(
                CourtComplexAmenity.complexId == complex.id
            ).all()
            amenity_names = [a.name for a in amenities]
            
            complexes_data.append({
                'id': complex.id,
                'name': complex.name,
                'address': complex.address,
                'city': complex.city,
                'sportType': complex.sportType,
                'description': complex.description,
                'phoneNumber': complex.phoneNumber,
                'googleMapLink': complex.googleMapLink,
                'openTime': complex.openTime.strftime('%H:%M') if complex.openTime else '06:00',
                'closeTime': complex.closeTime.strftime('%H:%M') if complex.closeTime else '22:00',
                'mainImage': complex.mainImage,
                'rating': float(complex.rating) if complex.rating else 0,
                'totalReviews': complex.totalReviews,
                'courtCount': court_count,
                'priceRange': {
                    'min': float(min_price),
                    'max': float(max_price)
                },
                'amenities': amenity_names
            })
        
        return jsonify({
            'courtComplexes': complexes_data,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'totalPages': (total + limit - 1) // limit
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@public_bp.route('court-complexes/<int:complex_id>', methods=['GET'])
def get_court_complex_details(complex_id):
    """Get details of a specific court complex by ID"""
    try:
        # Load complex and its relationships efficiently
        complex = db.session.query(CourtComplex).options(
            db.joinedload(CourtComplex.images), # Load tất cả ảnh
            db.joinedload(CourtComplex.amenities_rel).joinedload(CourtComplexAmenity.amenity), # Load tiện ích và thông tin chi tiết của tiện ích
            db.joinedload(CourtComplex.courts), # Load sân
            db.joinedload(CourtComplex.reviews) # Load reviews (để hiển thị sau)
        ).filter(CourtComplex.id == complex_id).first()

        if not complex or complex.status != 'Active':
            return jsonify({'error': 'Court complex not found or inactive'}), 404

        # Lấy tất cả URLs của ảnh
        all_image_urls = [img.imageUrl for img in complex.images] # Dùng complex.images đã được joinedload

        # Tìm mainImageIndex (nếu có)
        main_image_index = 0
        if complex.mainImage and complex.mainImage in all_image_urls:
            main_image_index = all_image_urls.index(complex.mainImage)

        # Lấy amenities
        amenities_data = [{'id': cca.amenity.id, 'name': cca.amenity.name, 'icon': cca.amenity.icon} for cca in complex.amenities_rel]

        # Lấy courts
        courts_data = []
        for court in complex.courts:
            courts_data.append({
                'id': court.id,
                'name': court.name,
                'status': court.status,
                # Không cần load pricing ở đây cho trang detail chung
            })

        # Lấy reviews
        reviews_data = []
        for review in complex.reviews:
            reviews_data.append({
                'id': review.id,
                'rating': review.rating,
                'comment': review.comment,
                'customerName': review.customer.fullName if review.customer else 'Khách ẩn danh',
                'date': review.createdAt.isoformat() # Dùng createdAt để làm ngày đánh giá
            })

        # Tính min/max price range (có thể lấy từ HourlyPriceRate nếu bạn có logic chung)
        # Hoặc bạn có thể thêm logic này vào Python để tính toán
        min_price = None
        max_price = None
        
        # Nếu bạn muốn tính min/max price dựa trên các HourlyPriceRate, bạn sẽ cần một truy vấn riêng
        # vì HourlyPriceRate không được load cùng với Complex ở đây để tránh quá tải.
        # Ví dụ:
        # if complex.courts:
        #     court_ids = [c.id for c in complex.courts]
        #     min_max_prices = db.session.query(
        #         func.min(HourlyPriceRate.price),
        #         func.max(HourlyPriceRate.price)
        #     ).filter(HourlyPriceRate.courtId.in_(court_ids)).first()
        #     min_price = float(min_max_prices[0]) if min_max_prices[0] else None
        #     max_price = float(min_max_prices[1]) if min_max_prices[1] else None

        complex_details = {
            'id': complex.id,
            'name': complex.name,
            'address': complex.address,
            'city': complex.city,
            'description': complex.description,
            'phoneNumber': complex.phoneNumber,
            'sportType': complex.sportType,
            'googleMapLink': complex.googleMapLink,
            'openTime': complex.openTime.strftime('%H:%M') if complex.openTime else None,
            'closeTime': complex.closeTime.strftime('%H:%M') if complex.closeTime else None,
            'amenities': amenities_data, # Trả về full objects {id, name, icon}
            'images': all_image_urls, # <<< TRẢ VỀ TẤT CẢ URL HÌNH ẢNH
            'mainImageIndex': main_image_index,
            'mainImage': complex.mainImage,
            'rating': float(complex.rating) if complex.rating else 0,
            'reviewCount': complex.totalReviews, # reviewCount là totalReviews
            'status': complex.status,
            'courts': courts_data, # Trả về các sân
            'reviews': reviews_data, # Trả về các reviews
            'priceRange': {'min': min_price, 'max': max_price} # Có thể tính toán hoặc trả về null nếu không có
        }
        
        return jsonify(complex_details)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@public_bp.route('/court-complexes/<int:complex_id>/courts/<int:court_id>/availability', methods=['GET'])
def get_court_availability(complex_id, court_id):
    """Get court availability for a specific date range"""
    try:
        # Get query parameters
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        
        if not start_date:
            start_date = datetime.now().date()
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        
        if not end_date:
            end_date = start_date + timedelta(days=7)
        else:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Verify court exists and belongs to complex
        court = db.session.query(Court).join(CourtComplex).filter(
            Court.id == court_id,
            Court.complexId == complex_id,
            Court.status == 'Active',
            CourtComplex.status == 'Active'
        ).first()
        
        if not court:
            return jsonify({'error': 'Court not found'}), 404
        
        # Get pricing for the court
        pricing = HourlyPriceRate.query.filter_by(courtId=court_id).all()
        pricing_map = {}
        for rate in pricing:
            day_key = rate.dayOfWeek
            if day_key not in pricing_map:
                pricing_map[day_key] = []
            pricing_map[day_key].append({
                'startTime': rate.startTime.strftime('%H:%M') if rate.startTime else '06:00',
                'endTime': rate.endTime.strftime('%H:%M') if rate.endTime else '22:00',
                'price': float(rate.price)
            })
        
        # Get existing bookings
        bookings = Booking.query.filter(
            Booking.courtId == court_id,
            Booking.startTime >= datetime.combine(start_date, datetime.min.time()),
            Booking.endTime <= datetime.combine(end_date, datetime.max.time()),
            Booking.status.in_(['Pending', 'Confirmed'])
        ).all()
        
        # Build availability data
        availability_data = []
        current_date = start_date
        
        while current_date <= end_date:
            day_name = current_date.strftime('%A')
            
            # Get pricing for this day
            day_pricing = pricing_map.get(day_name, [])
            
            # Get bookings for this day
            day_bookings = [
                {
                    'startTime': booking.startTime.strftime('%H:%M'),
                    'endTime': booking.endTime.strftime('%H:%M'),
                    'status': booking.status
                }
                for booking in bookings
                if booking.startTime.date() == current_date
            ]
            
            availability_data.append({
                'date': current_date.isoformat(),
                'dayOfWeek': day_name,
                'pricing': day_pricing,
                'bookings': day_bookings
            })
            
            current_date += timedelta(days=1)
        
        return jsonify({
            'court': {
                'id': court.id,
                'name': court.name,
                'complexName': court.complex.name
            },
            'availability': availability_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@public_bp.route('/cities', methods=['GET'])
def get_cities():
    """Get list of cities with court complexes"""
    try:
        cities = db.session.query(CourtComplex.city).filter_by(status='Active').distinct().all()
        city_list = [city[0] for city in cities]
        return jsonify({'cities': sorted(city_list)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@public_bp.route('/sport-types', methods=['GET'])
def get_sport_types():
    """Get list of sport types"""
    try:
        sport_types = db.session.query(CourtComplex.sportType).filter_by(status='Active').distinct().all()
        sport_type_list = [sport[0] for sport in sport_types]
        return jsonify({'sportTypes': sorted(sport_type_list)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@public_bp.route('/court-complexes/<int:complex_id>/availability', methods=['GET'])
def get_public_availability(complex_id):
    """Get availability calendar for a court complex (public access)"""
    try:
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
        
        # Get complex
        complex = CourtComplex.query.filter_by(id=complex_id, status='Active').first()
        if not complex:
            return jsonify({'error': 'Court complex not found'}), 404
        
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

@public_bp.route('/court-complexes/<int:complex_id>/availability-grid', methods=['GET'])
def get_availability_grid(complex_id):
    """Get availability in grid format (courts x time slots)"""
    try:
        # Get date from query params
        from datetime import datetime, timedelta
        date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Get complex
        complex = CourtComplex.query.filter_by(id=complex_id, status='Active').first()
        if not complex:
            return jsonify({'error': 'Court complex not found'}), 404
        
        # Get courts
        courts = Court.query.filter_by(complexId=complex_id, status='Active').all()
        
        # Get bookings for the selected date
        bookings = Booking.query.join(Court).filter(
            Court.complexId == complex_id,
            Booking.startTime >= datetime.combine(selected_date, datetime.min.time()),
            Booking.endTime <= datetime.combine(selected_date, datetime.max.time()),
            Booking.status.in_(['Pending', 'Confirmed'])
        ).all()
        
        # Generate time slots (every 1 hour from open to close)
        open_time = complex.openTime or datetime.strptime('06:00', '%H:%M').time()
        close_time = complex.closeTime or datetime.strptime('22:00', '%H:%M').time()
        
        time_slots = []
        current_time = datetime.combine(selected_date, open_time)
        end_time = datetime.combine(selected_date, close_time)
        
        while current_time < end_time:
            time_slots.append(current_time.strftime('%H:%M'))
            current_time += timedelta(hours=1)
        
        # Build grid data
        grid_data = []
        for court in courts:
            court_bookings = [b for b in bookings if b.courtId == court.id]
            
            court_row = {
                'courtId': court.id,
                'courtName': court.name,
                'slots': {}
            }
            
            for time_slot in time_slots:
                slot_datetime = datetime.combine(selected_date, datetime.strptime(time_slot, '%H:%M').time())
                slot_end = slot_datetime + timedelta(hours=1)
                
                # Check if this slot is booked
                is_booked = any(
                    booking.startTime <= slot_datetime < booking.endTime or
                    booking.startTime < slot_end <= booking.endTime or
                    (slot_datetime <= booking.startTime and slot_end >= booking.endTime)
                    for booking in court_bookings
                )
                
                # Check if this slot is in the past
                now = datetime.now()
                is_past = slot_datetime < now
                
                court_row['slots'][time_slot] = {
                    'available': not is_booked and not is_past,
                    'booking': None,
                    'isPast': is_past
                }
                
                # Add booking info if slot is booked
                if is_booked:
                    booking = next((b for b in court_bookings 
                                  if b.startTime <= slot_datetime < b.endTime), None)
                    if booking:
                        court_row['slots'][time_slot]['booking'] = {
                            'id': booking.id,
                            'customerName': booking.customer.fullName if booking.customer else booking.walkInCustomerName,
                            'startTime': booking.startTime.strftime('%H:%M'),
                            'endTime': booking.endTime.strftime('%H:%M'),
                            'status': booking.status
                        }
            
            grid_data.append(court_row)
        
        return jsonify({
            'complex': {
                'id': complex.id,
                'name': complex.name,
                'openTime': complex.openTime.strftime('%H:%M') if complex.openTime else '06:00',
                'closeTime': complex.closeTime.strftime('%H:%M') if complex.closeTime else '22:00'
            },
            'date': date_str,
            'timeSlots': time_slots,
            'courts': grid_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500