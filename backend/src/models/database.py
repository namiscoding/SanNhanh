from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()

# Users table
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)  # Nullable for Google auth
    image = db.Column(db.String(500), nullable=True)
    role = db.Column(db.String(50), default='Customer')  # Customer, Owner, Admin
    account_status = db.Column(db.Integer, default=1)  # 1: Active, 0: Blocked
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bookings = db.relationship('Booking', backref='booker', lazy=True)
    court_complexes = db.relationship('CourtComplex', backref='owner', lazy=True)

# Sport Types table
class SportType(db.Model):
    __tablename__ = 'sport_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    
    # Relationships
    court_complexes = db.relationship('CourtComplex', backref='sport_type', lazy=True)

# Court Complexes table
class CourtComplex(db.Model):
    __tablename__ = 'court_complexes'
    
    id = db.Column(db.Integer, primary_key=True)
    owner_user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    sport_type_id = db.Column(db.Integer, db.ForeignKey('sport_types.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    address = db.Column(db.String(500), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    district = db.Column(db.String(100), nullable=False)
    google_maps_link = db.Column(db.String(500), nullable=True)
    contact_email = db.Column(db.String(255), nullable=False)
    bank_code = db.Column(db.String(10), nullable=False)
    account_number = db.Column(db.String(50), nullable=False)
    account_name = db.Column(db.String(255), nullable=False)
    is_active_by_owner = db.Column(db.Boolean, default=True)
    
    # Relationships
    courts = db.relationship('Court', backref='court_complex', lazy=True, cascade='all, delete-orphan')
    products = db.relationship('Product', backref='court_complex', lazy=True, cascade='all, delete-orphan')
    amenities = db.relationship('CourtComplexAmenity', backref='court_complex', lazy=True, cascade='all, delete-orphan')
    images = db.relationship('CourtComplexImage', backref='court_complex', lazy=True, cascade='all, delete-orphan')

# Courts table
class Court(db.Model):
    __tablename__ = 'courts'
    
    id = db.Column(db.Integer, primary_key=True)
    court_complex_id = db.Column(db.Integer, db.ForeignKey('court_complexes.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    status_by_owner = db.Column(db.Integer, default=1)  # 1: Active, 0: Inactive
    
    # Relationships
    bookings = db.relationship('Booking', backref='court', lazy=True)
    hourly_rates = db.relationship('HourlyPriceRate', backref='court', lazy=True, cascade='all, delete-orphan')
    blocked_slots = db.relationship('BlockedCourtSlot', backref='court', lazy=True, cascade='all, delete-orphan')

# Bookings table
class Booking(db.Model):
    __tablename__ = 'bookings'
    
    id = db.Column(db.BigInteger, primary_key=True)
    booker_user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    court_id = db.Column(db.Integer, db.ForeignKey('courts.id'), nullable=False)
    booked_start_time = db.Column(db.DateTime, nullable=False)
    booked_end_time = db.Column(db.DateTime, nullable=False)
    total_price = db.Column(db.Numeric(10, 2), nullable=False)
    booking_status = db.Column(db.Integer, default=1)  # 1: Pending, 2: Confirmed, 3: Cancelled, 4: Completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    booking_products = db.relationship('BookingProduct', backref='booking', lazy=True, cascade='all, delete-orphan')

# Products table
class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    court_complex_id = db.Column(db.Integer, db.ForeignKey('court_complexes.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    booking_products = db.relationship('BookingProduct', backref='product', lazy=True)

# Booking Products table
class BookingProduct(db.Model):
    __tablename__ = 'booking_products'
    
    id = db.Column(db.BigInteger, primary_key=True)
    booking_id = db.Column(db.BigInteger, db.ForeignKey('bookings.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price_at_time_of_addition = db.Column(db.Numeric(10, 2), nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)

# Hourly Price Rates table
class HourlyPriceRate(db.Model):
    __tablename__ = 'hourly_price_rates'
    
    id = db.Column(db.Integer, primary_key=True)
    court_id = db.Column(db.Integer, db.ForeignKey('courts.id'), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=True)  # 1-7, NULL for all days
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    price_per_hour = db.Column(db.Numeric(10, 2), nullable=False)

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
    court_complex_id = db.Column(db.Integer, db.ForeignKey('court_complexes.id'), nullable=False)
    amenity_id = db.Column(db.Integer, db.ForeignKey('amenities.id'), nullable=False)

# Court Complex Images table
class CourtComplexImage(db.Model):
    __tablename__ = 'court_complex_images'
    
    id = db.Column(db.Integer, primary_key=True)
    court_complex_id = db.Column(db.Integer, db.ForeignKey('court_complexes.id'), nullable=False)
    image_url = db.Column(db.String(500), nullable=False)
    is_primary = db.Column(db.Boolean, default=False)

# Product Categories table
class ProductCategory(db.Model):
    __tablename__ = 'product_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

# Blocked Court Slots table
class BlockedCourtSlot(db.Model):
    __tablename__ = 'blocked_court_slots'
    
    id = db.Column(db.Integer, primary_key=True)
    court_id = db.Column(db.Integer, db.ForeignKey('courts.id'), nullable=False)
    blocked_start_time = db.Column(db.DateTime, nullable=False)
    blocked_end_time = db.Column(db.DateTime, nullable=False)
    reason = db.Column(db.String(255), nullable=True)

# Notifications table
class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# System Configurations table
class SystemConfiguration(db.Model):
    __tablename__ = 'system_configurations'
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=False)
    description = db.Column(db.String(255), nullable=True)

