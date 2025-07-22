from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.database import db, User, CourtComplex, Review, Booking, Court
from datetime import datetime
from decimal import Decimal

review_bp = Blueprint('review', __name__)

@review_bp.route('/', methods=['POST'])
@jwt_required()
def create_review():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['complexId', 'rating', 'comment']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        complex_id = data['complexId']
        rating = data['rating']
        comment = data['comment']
        
        # Validate rating
        if not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        
        # Kiểm tra complex tồn tại
        complex = CourtComplex.query.get(complex_id)
        if not complex:
            return jsonify({'error': 'Court complex not found'}), 404
        
        # Kiểm tra user đã từng booking ở complex này chưa
        has_booking = Booking.query.join(Court).filter(
            Court.complexId == complex_id,
            Booking.customerId == current_user_id,
            Booking.status == 'Confirmed'
        ).first()
        
        if not has_booking:
            return jsonify({'error': 'You can only review complexes you have booked'}), 400
        
        # Kiểm tra đã review chưa
        existing_review = Review.query.filter_by(
            customerId=current_user_id,
            complexId=complex_id
        ).first()
        
        if existing_review:
            return jsonify({'error': 'You have already reviewed this complex'}), 400
        
        # Tạo review mới
        review = Review(
            customerId=current_user_id,
            complexId=complex_id,
            rating=Decimal(str(rating)),
            comment=comment
        )
        
        db.session.add(review)
        
        # Cập nhật rating trung bình của complex
        avg_rating = db.session.query(db.func.avg(Review.rating)).filter_by(complexId=complex_id).scalar()
        total_reviews = Review.query.filter_by(complexId=complex_id).count() + 1
        
        complex.rating = avg_rating
        complex.totalReviews = total_reviews
        
        db.session.commit()
        
        return jsonify({
            'message': 'Review created successfully',
            'review': {
                'id': review.id,
                'rating': float(review.rating),
                'comment': review.comment,
                'createdAt': review.createdAt.isoformat() if review.createdAt else None
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@review_bp.route('/complex/<int:complex_id>', methods=['GET'])
def get_complex_reviews(complex_id):
    try:
        # Lấy query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Kiểm tra complex tồn tại
        complex = CourtComplex.query.get(complex_id)
        if not complex:
            return jsonify({'error': 'Court complex not found'}), 404
        
        # Lấy reviews với pagination
        reviews_query = Review.query.filter_by(complexId=complex_id).order_by(Review.createdAt.desc())
        reviews_pagination = reviews_query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        reviews_data = []
        for review in reviews_pagination.items:
            reviews_data.append({
                'id': review.id,
                'customer': {
                    'fullName': review.customer.fullName if review.customer else None,
                    'image': review.customer.image if review.customer else None
                },
                'rating': float(review.rating),
                'comment': review.comment,
                'createdAt': review.createdAt.isoformat() if review.createdAt else None
            })
        
        # Thống kê rating
        rating_stats = {}
        for i in range(1, 6):
            count = Review.query.filter_by(complexId=complex_id, rating=i).count()
            rating_stats[f'star_{i}'] = count
        
        return jsonify({
            'reviews': reviews_data,
            'pagination': {
                'page': page,
                'pages': reviews_pagination.pages,
                'per_page': per_page,
                'total': reviews_pagination.total
            },
            'summary': {
                'averageRating': float(complex.rating) if complex.rating else 0,
                'totalReviews': complex.totalReviews or 0,
                'ratingStats': rating_stats
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@review_bp.route('/<int:review_id>', methods=['PUT'])
@jwt_required()
def update_review(review_id):
    try:
        current_user_id = get_jwt_identity()
        
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        # Kiểm tra quyền sở hữu
        if review.customerId != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        
        # Cập nhật review
        if 'rating' in data:
            rating = data['rating']
            if not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
                return jsonify({'error': 'Rating must be between 1 and 5'}), 400
            review.rating = Decimal(str(rating))
        
        if 'comment' in data:
            review.comment = data['comment']
        
        db.session.commit()
        
        # Cập nhật lại rating trung bình của complex
        complex = review.complex
        avg_rating = db.session.query(db.func.avg(Review.rating)).filter_by(complexId=complex.id).scalar()
        complex.rating = avg_rating
        db.session.commit()
        
        return jsonify({'message': 'Review updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@review_bp.route('/<int:review_id>', methods=['DELETE'])
@jwt_required()
def delete_review(review_id):
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        # Kiểm tra quyền (chỉ chủ review hoặc admin)
        if review.customerId != current_user_id and user.role != 'Admin':
            return jsonify({'error': 'Access denied'}), 403
        
        complex = review.complex
        
        db.session.delete(review)
        
        # Cập nhật lại rating trung bình của complex
        avg_rating = db.session.query(db.func.avg(Review.rating)).filter_by(complexId=complex.id).scalar()
        total_reviews = Review.query.filter_by(complexId=complex.id).count() - 1
        
        complex.rating = avg_rating if avg_rating else 0
        complex.totalReviews = total_reviews
        
        db.session.commit()
        
        return jsonify({'message': 'Review deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@review_bp.route('/my-reviews', methods=['GET'])
@jwt_required()
def get_my_reviews():
    try:
        current_user_id = get_jwt_identity()
        
        reviews = Review.query.filter_by(customerId=current_user_id).order_by(Review.createdAt.desc()).all()
        reviews_data = []
        
        for review in reviews:
            reviews_data.append({
                'id': review.id,
                'complex': {
                    'id': review.complex.id,
                    'name': review.complex.name,
                    'address': review.complex.address
                },
                'rating': float(review.rating),
                'comment': review.comment,
                'createdAt': review.createdAt.isoformat() if review.createdAt else None
            })
        
        return jsonify({'reviews': reviews_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

