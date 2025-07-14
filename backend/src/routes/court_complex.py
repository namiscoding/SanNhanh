from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.database import db, CourtComplex, Court, SportType, User, HourlyPriceRate, Product, Amenity, CourtComplexAmenity, CourtComplexImage
from datetime import datetime, time

court_complex_bp = Blueprint('court_complex', __name__)

def owner_required():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    return user and user.role in ['Owner', 'Admin']

@court_complex_bp.route('', methods=['GET'])
def get_court_complexes():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        sport_type_id = request.args.get('sport_type_id', type=int)
        city = request.args.get('city', '')
        district = request.args.get('district', '')
        search = request.args.get('search', '')
        
        query = CourtComplex.query.filter(CourtComplex.is_active_by_owner == True)
        
        if sport_type_id:
            query = query.filter(CourtComplex.sport_type_id == sport_type_id)
        
        if city:
            query = query.filter(CourtComplex.city.contains(city))
        
        if district:
            query = query.filter(CourtComplex.district.contains(district))
        
        if search:
            query = query.filter(CourtComplex.name.contains(search))
        
        complexes = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        result = []
        for complex in complexes.items:
            # Get primary image
            primary_image = CourtComplexImage.query.filter_by(
                court_complex_id=complex.id, 
                is_primary=True
            ).first()
            
            # Get amenities
            amenities = db.session.query(Amenity).join(CourtComplexAmenity).filter(
                CourtComplexAmenity.court_complex_id == complex.id
            ).all()
            
            result.append({
                'id': complex.id,
                'name': complex.name,
                'address': complex.address,
                'city': complex.city,
                'district': complex.district,
                'sportType': complex.sport_type.name,
                'primaryImage': primary_image.image_url if primary_image else None,
                'amenities': [{'id': a.id, 'name': a.name, 'icon': a.icon} for a in amenities]
            })
        
        return jsonify({
            'courtComplexes': result,
            'total': complexes.total,
            'pages': complexes.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@court_complex_bp.route('/<int:complex_id>', methods=['GET'])
def get_court_complex_detail(complex_id):
    try:
        complex = CourtComplex.query.get(complex_id)
        if not complex:
            return jsonify({'error': 'Khu phức hợp không tồn tại'}), 404
        
        # Get courts
        courts = Court.query.filter_by(court_complex_id=complex_id, status_by_owner=1).all()
        
        # Get products
        products = Product.query.filter_by(court_complex_id=complex_id, is_active=True).all()
        
        # Get amenities
        amenities = db.session.query(Amenity).join(CourtComplexAmenity).filter(
            CourtComplexAmenity.court_complex_id == complex_id
        ).all()
        
        # Get images
        images = CourtComplexImage.query.filter_by(court_complex_id=complex_id).all()
        
        return jsonify({
            'id': complex.id,
            'name': complex.name,
            'address': complex.address,
            'city': complex.city,
            'district': complex.district,
            'googleMapsLink': complex.google_maps_link,
            'contactEmail': complex.contact_email,
            'sportType': complex.sport_type.name,
            'courts': [{
                'id': court.id,
                'name': court.name
            } for court in courts],
            'products': [{
                'id': product.id,
                'name': product.name,
                'unitPrice': float(product.unit_price)
            } for product in products],
            'amenities': [{
                'id': amenity.id,
                'name': amenity.name,
                'icon': amenity.icon
            } for amenity in amenities],
            'images': [{
                'id': image.id,
                'imageUrl': image.image_url,
                'isPrimary': image.is_primary
            } for image in images]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@court_complex_bp.route('', methods=['POST'])
@jwt_required()
def create_court_complex():
    try:
        if not owner_required():
            return jsonify({'error': 'Không có quyền truy cập'}), 403
        
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        new_complex = CourtComplex(
            owner_user_id=current_user_id,
            sport_type_id=data['sportTypeId'],
            name=data['name'],
            address=data['address'],
            city=data['city'],
            district=data['district'],
            google_maps_link=data.get('googleMapsLink', ''),
            contact_email=data['contactEmail'],
            bank_code=data['bankCode'],
            account_number=data['accountNumber'],
            account_name=data['accountName']
        )
        
        db.session.add(new_complex)
        db.session.commit()
        
        return jsonify({
            'message': 'Tạo khu phức hợp thành công',
            'id': new_complex.id
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@court_complex_bp.route('/my-complexes', methods=['GET'])
@jwt_required()
def get_my_complexes():
    try:
        if not owner_required():
            return jsonify({'error': 'Không có quyền truy cập'}), 403
        
        current_user_id = get_jwt_identity()
        complexes = CourtComplex.query.filter_by(owner_user_id=current_user_id).all()
        
        result = []
        for complex in complexes:
            courts_count = Court.query.filter_by(court_complex_id=complex.id).count()
            
            result.append({
                'id': complex.id,
                'name': complex.name,
                'address': complex.address,
                'city': complex.city,
                'district': complex.district,
                'sportType': complex.sport_type.name,
                'isActiveByOwner': complex.is_active_by_owner,
                'courtsCount': courts_count
            })
        
        return jsonify({'courtComplexes': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@court_complex_bp.route('/<int:complex_id>/courts', methods=['POST'])
@jwt_required()
def create_court(complex_id):
    try:
        if not owner_required():
            return jsonify({'error': 'Không có quyền truy cập'}), 403
        
        current_user_id = get_jwt_identity()
        
        # Check if user owns this complex
        complex = CourtComplex.query.filter_by(id=complex_id, owner_user_id=current_user_id).first()
        if not complex:
            return jsonify({'error': 'Không có quyền truy cập khu phức hợp này'}), 403
        
        data = request.get_json()
        
        new_court = Court(
            court_complex_id=complex_id,
            name=data['name']
        )
        
        db.session.add(new_court)
        db.session.commit()
        
        return jsonify({
            'message': 'Tạo sân thành công',
            'id': new_court.id
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@court_complex_bp.route('/courts/<int:court_id>/hourly-rates', methods=['POST'])
@jwt_required()
def create_hourly_rate(court_id):
    try:
        if not owner_required():
            return jsonify({'error': 'Không có quyền truy cập'}), 403
        
        current_user_id = get_jwt_identity()
        
        # Check if user owns this court
        court = db.session.query(Court).join(CourtComplex).filter(
            Court.id == court_id,
            CourtComplex.owner_user_id == current_user_id
        ).first()
        
        if not court:
            return jsonify({'error': 'Không có quyền truy cập sân này'}), 403
        
        data = request.get_json()
        
        new_rate = HourlyPriceRate(
            court_id=court_id,
            day_of_week=data.get('dayOfWeek'),
            start_time=time.fromisoformat(data['startTime']),
            end_time=time.fromisoformat(data['endTime']),
            price_per_hour=data['pricePerHour']
        )
        
        db.session.add(new_rate)
        db.session.commit()
        
        return jsonify({'message': 'Tạo khung giá thành công'}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@court_complex_bp.route('/sport-types', methods=['GET'])
def get_sport_types():
    try:
        sport_types = SportType.query.all()
        return jsonify({
            'sportTypes': [{
                'id': st.id,
                'name': st.name
            } for st in sport_types]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@court_complex_bp.route('/amenities', methods=['GET'])
def get_amenities():
    try:
        amenities = Amenity.query.all()
        return jsonify({
            'amenities': [{
                'id': amenity.id,
                'name': amenity.name,
                'icon': amenity.icon
            } for amenity in amenities]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

