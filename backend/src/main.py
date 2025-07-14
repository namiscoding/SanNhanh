import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from src.models.database import db
from src.routes.auth import auth_bp
from src.routes.admin import admin_bp
from src.routes.court_complex import court_complex_bp
from src.routes.booking import booking_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'
app.config['JWT_SECRET_KEY'] = 'jwt-secret-string'  # Change this in production

# Enable CORS for all routes
CORS(app)

# Initialize JWT
jwt = JWTManager(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(court_complex_bp, url_prefix='/api/court-complexes')
app.register_blueprint(booking_bp, url_prefix='/api/bookings')

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()
    
    # Create default data
    from src.models.database import SportType, Amenity, User
    import bcrypt
    
    # Create default sport types
    if not SportType.query.first():
        sport_types = [
            SportType(name='Bóng đá'),
            SportType(name='Bóng rổ'),
            SportType(name='Cầu lông'),
            SportType(name='Tennis'),
            SportType(name='Bóng chuyền')
        ]
        for sport_type in sport_types:
            db.session.add(sport_type)
    
    # Create default amenities
    if not Amenity.query.first():
        amenities = [
            Amenity(name='Bãi đỗ xe', icon='car'),
            Amenity(name='Phòng thay đồ', icon='shirt'),
            Amenity(name='Nhà vệ sinh', icon='toilet'),
            Amenity(name='Căng tin', icon='coffee'),
            Amenity(name='WiFi miễn phí', icon='wifi'),
            Amenity(name='Điều hòa', icon='air-conditioner'),
            Amenity(name='Tủ khóa', icon='lock')
        ]
        for amenity in amenities:
            db.session.add(amenity)
    
    # Create default admin user
    if not User.query.filter_by(role='Admin').first():
        password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        admin_user = User(
            full_name='Administrator',
            email='admin@courtbooking.com',
            password_hash=password_hash,
            role='Admin'
        )
        db.session.add(admin_user)
    
    db.session.commit()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

