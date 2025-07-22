from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
# Đảm bảo các imports này đúng với cấu trúc thư mục của bạn
from src.models.database import db, CourtComplex, Court, SportType, User, HourlyPriceRate, Product, Amenity, CourtComplexAmenity, CourtComplexImage
from src.services.cloudinary_service import CloudinaryService # Đảm bảo service này tồn tại và hoạt động
from datetime import datetime, time
import traceback # Để in chi tiết lỗi

court_complex_bp = Blueprint('court_complex', __name__)

@court_complex_bp.route('/', methods=['GET'])
def get_court_complexes():
    try:
        # Get query parameters
        city = request.args.get('city')
        sport_type = request.args.get('sportType') # Bạn có trường sportType trong CourtComplex, hãy sử dụng nó
        search = request.args.get('search')
        
        # Build query
        query = CourtComplex.query.filter_by(status='Active')
        
        if city:
            query = query.filter(CourtComplex.city == city)
        
        if sport_type: # Thêm lọc theo sportType
            query = query.filter(CourtComplex.sportType.ilike(f'%{sport_type}%')) # Sử dụng ilike để tìm kiếm không phân biệt chữ hoa/thường

        if search:
            query = query.filter(
                CourtComplex.name.ilike(f'%{search}%') | # Sử dụng ilike
                CourtComplex.address.ilike(f'%{search}%')
            )
        
        complexes = query.all()
        complexes_data = []
        
        for complex in complexes:
            complexes_data.append({
                'id': complex.id,
                'name': complex.name,
                'address': complex.address,
                'city': complex.city,
                'description': complex.description,
                'phoneNumber': complex.phoneNumber,
                'sportType': complex.sportType, # Bao gồm sportType
                'openTime': complex.openTime.strftime('%H:%M') if complex.openTime else None,
                'closeTime': complex.closeTime.strftime('%H:%M') if complex.closeTime else None,
                'mainImage': complex.mainImage, # Bao gồm mainImage
                'rating': float(complex.rating) if complex.rating else 0,
                'totalReviews': complex.totalReviews or 0
            })
        
        return jsonify({'courtComplexes': complexes_data}), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@court_complex_bp.route('/<int:complex_id>', methods=['GET'])
def get_court_complex_detail(complex_id):
    try:
        complex = CourtComplex.query.get(complex_id)
        if not complex:
            return jsonify({'error': 'Court complex not found'}), 404
        
        # Get courts
        courts = Court.query.filter_by(complexId=complex_id, status='Active').all()
        courts_data = []
        
        for court in courts:
            # Get hourly price rates for each court
            hourly_rates = HourlyPriceRate.query.filter_by(courtId=court.id).all()
            rates_data = []
            for rate in hourly_rates:
                rates_data.append({
                    'id': rate.id,
                    'dayOfWeek': rate.dayOfWeek,
                    'startTime': rate.startTime.strftime('%H:%M'),
                    'endTime': rate.endTime.strftime('%H:%M'),
                    'price': float(rate.price)
                })

            courts_data.append({
                'id': court.id,
                'name': court.name,
                'status': court.status,
                'pricing': rates_data # Include pricing details
            })
        
        # Get complex images
        complex_images = CourtComplexImage.query.filter_by(complexId=complex_id).all()
        images_data = []
        for img in complex_images:
            images_data.append({
                'id': img.id,
                'imageUrl': img.imageUrl,
                'isMain': img.isMain
            })

        # Get complex amenities
        complex_amenities_relationships = CourtComplexAmenity.query.filter_by(complexId=complex_id).all()
        amenities_data = []
        for cca in complex_amenities_relationships:
            amenity = Amenity.query.get(cca.amenityId)
            if amenity:
                amenities_data.append({
                    'id': amenity.id,
                    'name': amenity.name,
                    'icon': amenity.icon
                })

        complex_data = {
            'id': complex.id,
            'ownerId': complex.ownerId, # Thêm ownerId
            'name': complex.name,
            'address': complex.address,
            'city': complex.city,
            'description': complex.description,
            'phoneNumber': complex.phoneNumber,
            'sportType': complex.sportType, # Bao gồm sportType
            'openTime': complex.openTime.strftime('%H:%M') if complex.openTime else None,
            'closeTime': complex.closeTime.strftime('%H:%M') if complex.closeTime else None,
            'mainImage': complex.mainImage, # Bao gồm mainImage
            'rating': float(complex.rating) if complex.rating else 0,
            'totalReviews': complex.totalReviews or 0,
            'status': complex.status,
            'createdAt': complex.createdAt.isoformat(), # Thêm createdAt
            'courts': courts_data,
            'images': images_data, # Bao gồm danh sách ảnh
            'amenities': amenities_data # Bao gồm danh sách tiện ích
        }
        
        return jsonify(complex_data), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@court_complex_bp.route('/', methods=['POST'])
@jwt_required()
def create_court_complex():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role not in ['Owner', 'Admin']:
            return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'address', 'city', 'phoneNumber', 'sportType', 'openTime', 'closeTime', 'courts']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Validate and convert times
        try:
            open_time = datetime.strptime(data['openTime'], '%H:%M').time()
            close_time = datetime.strptime(data['closeTime'], '%H:%M').time()
        except ValueError:
            return jsonify({'error': 'Invalid time format. Use HH:MM (e.g., "06:00").'}), 400

        # Create new court complex
        complex = CourtComplex(
            ownerId=current_user_id,
            name=data['name'],
            address=data['address'],
            city=data['city'],
            description=data.get('description', ''),
            phoneNumber=data['phoneNumber'],
            sportType=data['sportType'],
            openTime=open_time,
            closeTime=close_time,
            status='Pending' # Hoặc 'Active' nếu bạn muốn nó tự động kích hoạt
        )
        
        db.session.add(complex)
        db.session.flush()  # Get the complex ID

        # Handle images upload
        if data.get('images') and isinstance(data['images'], list):
            main_image_set = False
            for i, image_data_b64 in enumerate(data['images']): # image_data_b64 is base64 string
                # Upload to Cloudinary
                upload_result = CloudinaryService.upload_image(
                    image_data_b64, # Pass base64 string
                    folder=f"court-complexes/{complex.id}"
                )
                
                if upload_result and upload_result.get('success'):
                    is_main = (i == data.get('mainImageIndex', 0) and not main_image_set) or \
                              (data.get('mainImageIndex') is None and i == 0 and not main_image_set) # First image is main by default if not specified
                    
                    complex_image = CourtComplexImage(
                        complexId=complex.id,
                        imageUrl=upload_result['url'],
                        publicId=upload_result['public_id'],
                        isMain=is_main
                    )
                    db.session.add(complex_image)
                    
                    if is_main:
                        complex.mainImage = upload_result['url']
                        main_image_set = True
                else:
                    db.session.rollback()
                    return jsonify({'error': f'Image upload failed for image {i + 1}: {upload_result.get("error", "Unknown error")}'}), 500
        
        # Add amenities
        if data.get('amenities') and isinstance(data['amenities'], list):
            for amenity_id in data['amenities']:
                # Optional: Validate if amenity_id exists in your Amenity table
                # amenity = Amenity.query.get(amenity_id)
                # if not amenity:
                #    db.session.rollback()
                #    return jsonify({'error': f'Amenity with ID {amenity_id} not found'}), 400

                complex_amenity = CourtComplexAmenity(
                    complexId=complex.id,
                    amenityId=amenity_id
                )
                db.session.add(complex_amenity)
        
        # Create courts
        if data.get('courts') and isinstance(data['courts'], list):
            for court_data in data['courts']:
                # Basic court data validation
                if not court_data.get('name'):
                    db.session.rollback()
                    return jsonify({'error': 'Court name is required for all courts'}), 400

                court = Court(
                    complexId=complex.id,
                    name=court_data['name'],
                    status='Active' # Default status for new courts
                )
                db.session.add(court)
                db.session.flush()  # Get court ID
                
                # Create hourly price rates
                if court_data.get('pricing') and isinstance(court_data['pricing'], list):
                    for price_entry in court_data['pricing']: # Corrected variable name
                        # Validate price entry fields
                        price_required_fields = ['dayOfWeek', 'startTime', 'endTime', 'price']
                        for field in price_required_fields:
                            if price_entry.get(field) is None: # Use is None for numerical/boolean checks
                                db.session.rollback()
                                return jsonify({'error': f'Missing price field "{field}" for court "{court_data["name"]}"'}), 400
                        
                        try:
                            start_time = datetime.strptime(price_entry['startTime'], '%H:%M').time()
                            end_time = datetime.strptime(price_entry['endTime'], '%H:%M').time()
                            price_value = float(price_entry['price'])
                        except (ValueError, TypeError) as ve:
                            db.session.rollback()
                            return jsonify({'error': f'Invalid price data format for court "{court_data["name"]}": {str(ve)}'}), 400

                        rate = HourlyPriceRate(
                            courtId=court.id,
                            dayOfWeek=price_entry.get('dayOfWeek', 'All'), # Default to 'All' if not provided
                            startTime=start_time,
                            endTime=end_time,
                            price=price_value
                        )
                        db.session.add(rate)
                else:
                    db.session.rollback()
                    return jsonify({'error': f'Pricing data is required and must be a list for court "{court_data["name"]}"'}), 400
        else:
            db.session.rollback()
            return jsonify({'error': 'At least one court is required to create a complex'}), 400


        db.session.commit()
        
        return jsonify({
            'message': 'Court complex created successfully',
            'complexId': complex.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        traceback.print_exc() # In chi tiết lỗi để debug
        return jsonify({'error': str(e)}), 500