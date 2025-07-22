from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()

# Users table
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fullName = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    passwordHash = db.Column(db.String(255), nullable=True)  # Nullable for Google auth
    image = db.Column(db.String(500), nullable=True)
    role = db.Column(db.String(50), default='Customer')  # Customer, Owner, Admin
    accountStatus = db.Column(db.Integer, default=1)  # 1: Active, 0: Blocked
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bookings = db.relationship('Booking', foreign_keys='Booking.customerId', backref='customer', lazy=True)
    court_complexes = db.relationship('CourtComplex', foreign_keys='CourtComplex.ownerId', backref='owner', lazy=True)
    reviews = db.relationship('Review', foreign_keys='Review.customerId', backref='customer', lazy=True)
    notifications = db.relationship('Notification', foreign_keys='Notification.userId', backref='user', lazy=True)

# Sport Types table
class SportType(db.Model):
    __tablename__ = 'sport_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

# Court Complexes table
class CourtComplex(db.Model):
    __tablename__ = 'court_complexes'
    
    id = db.Column(db.Integer, primary_key=True)
    ownerId = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    address = db.Column(db.String(500), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    phoneNumber = db.Column(db.String(20), nullable=False)
    sportType = db.Column(db.String(50), nullable=False)  # Moved from Court to CourtComplex
    googleMapLink = db.Column(db.String(1000), nullable=True)  # Google Maps link
    
    # Banking information for VietQR
    bankCode = db.Column(db.String(10), nullable=True)  # e.g., "970415" for Vietinbank
    accountNumber = db.Column(db.String(50), nullable=True)
    accountName = db.Column(db.String(100), nullable=True)
    
    openTime = db.Column(db.Time, nullable=True)
    closeTime = db.Column(db.Time, nullable=True)
    mainImage = db.Column(db.String(500), nullable=True)  # Main display image URL
    rating = db.Column(db.Numeric(3, 2), default=0)
    totalReviews = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='Active')  # Active, Inactive
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    amenities_rel = db.relationship('CourtComplexAmenity', back_populates='complex', cascade="all, delete-orphan") # <<< ĐẢM BẢO DÒNG NÀY CÓ VÀ ĐÚNG TÊN

    courts = db.relationship('Court', foreign_keys='Court.complexId', backref='complex', lazy=True, cascade='all, delete-orphan')
    reviews = db.relationship('Review', foreign_keys='Review.complexId', backref='complex', lazy=True)
    images = db.relationship('CourtComplexImage', foreign_keys='CourtComplexImage.complexId', backref='complex', lazy=True, cascade='all, delete-orphan')

# Courts table
class Court(db.Model):
    __tablename__ = 'courts'
    
    id = db.Column(db.Integer, primary_key=True)
    complexId = db.Column(db.Integer, db.ForeignKey('court_complexes.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), default='Active')  # Active, Inactive
    
    # Relationships
    bookings = db.relationship('Booking', foreign_keys='Booking.courtId', backref='court', lazy=True)
    hourly_rates = db.relationship('HourlyPriceRate', foreign_keys='HourlyPriceRate.courtId', backref='court', lazy=True, cascade='all, delete-orphan')

# Bookings table
class Booking(db.Model):
    __tablename__ = 'bookings'
    
    id = db.Column(db.BigInteger, primary_key=True)
    customerId = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)  # Nullable for walk-in
    courtId = db.Column(db.Integer, db.ForeignKey('courts.id'), nullable=False)
    
    # Walk-in customer info (when customerId is null)
    walkInCustomerName = db.Column(db.String(255), nullable=True)
    walkInCustomerPhone = db.Column(db.String(20), nullable=True)
    
    startTime = db.Column(db.DateTime, nullable=False)
    endTime = db.Column(db.DateTime, nullable=False)
    totalPrice = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(20), default='Pending')  # Pending, Confirmed, Cancelled, Completed
    bookingType = db.Column(db.String(20), default='Online')  # Online, WalkIn
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    booking_products = db.relationship('BookingProduct', foreign_keys='BookingProduct.bookingId', backref='booking', lazy=True, cascade='all, delete-orphan')

# Products table
class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    complexId = db.Column(db.Integer, db.ForeignKey('court_complexes.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    isActive = db.Column(db.Boolean, default=True)
    
    # Relationships
    booking_products = db.relationship('BookingProduct', foreign_keys='BookingProduct.productId', backref='product', lazy=True)

# Booking Products table
class BookingProduct(db.Model):
    __tablename__ = 'booking_products'
    
    id = db.Column(db.BigInteger, primary_key=True)
    bookingId = db.Column(db.BigInteger, db.ForeignKey('bookings.id'), nullable=False)
    productId = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unitPrice = db.Column(db.Numeric(10, 2), nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)

# Hourly Price Rates table
class HourlyPriceRate(db.Model):
    __tablename__ = 'hourly_price_rates'
    
    id = db.Column(db.Integer, primary_key=True)
    courtId = db.Column(db.Integer, db.ForeignKey('courts.id'), nullable=False)
    dayOfWeek = db.Column(db.String(10), nullable=True)  # Monday, Tuesday, etc. or 'All'
    startTime = db.Column(db.Time, nullable=False)
    endTime = db.Column(db.Time, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)

# Amenities table
class Amenity(db.Model):
    __tablename__ = 'amenities'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    icon = db.Column(db.String(100), nullable=True)

# Court Complex Amenities table
class CourtComplexAmenity(db.Model):
    __tablename__ = 'court_complex_amenities'
    
    id = db.Column(db.Integer, primary_key=True)
    complexId = db.Column(db.Integer, db.ForeignKey('court_complexes.id'), nullable=False)
    amenityId = db.Column(db.Integer, db.ForeignKey('amenities.id'), nullable=False)
    complex = db.relationship('CourtComplex', back_populates='amenities_rel')
    amenity = db.relationship('Amenity')
# Reviews table
class Review(db.Model):
    __tablename__ = 'reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    customerId = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    complexId = db.Column(db.Integer, db.ForeignKey('court_complexes.id'), nullable=False)
    rating = db.Column(db.Numeric(2, 1), nullable=False)  # 1.0 to 5.0
    comment = db.Column(db.Text, nullable=True)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)

# Notifications table
class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    userId = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(20), default='info')  # info, success, warning, error
    isRead = db.Column(db.Boolean, default=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)


# Court Complex Images table
class CourtComplexImage(db.Model):
    __tablename__ = 'court_complex_images'
    
    id = db.Column(db.Integer, primary_key=True)
    complexId = db.Column(db.Integer, db.ForeignKey('court_complexes.id'), nullable=False)
    imageUrl = db.Column(db.String(500), nullable=False)
    publicId = db.Column(db.String(255), nullable=True)  # Cloudinary public_id for deletion
    isMain = db.Column(db.Boolean, default=False)  # Main display image
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)

