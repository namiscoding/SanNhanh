# backend/src/main.py

import os
import sys
from dotenv import load_dotenv
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(backend_root, '.env'))

# Import the 'db' instance directly from your database module
from src.models.database import db

# Initialize Migrate globally, but without linking to app/db yet
migrate = Migrate()

def create_app():
    app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_secret_key_for_dev')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'default_jwt_secret_key_for_dev')

    CORS(app)
    jwt = JWTManager(app)

    database_url = os.getenv('DATABASE_URL', 'postgresql://sa:nam11082004@localhost:5432/sportsync_db')
    print(f"DEBUG: DATABASE_URL from .env: {database_url}")
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Link the globally defined 'db' and 'migrate' instances to the app
    db.init_app(app)
    migrate.init_app(app, db)

    # Register blueprints (keep these imports here to avoid circular dependencies
    # if any blueprint imports from models that depend on 'db' already initialized)
    from src.routes.auth import auth_bp
    from src.routes.admin import admin_bp
    from src.routes.court_complex import court_complex_bp
    from src.routes.booking import booking_bp
    from src.routes.owner import owner_bp
    from src.routes.review import review_bp
    from src.routes.notification import notification_bp
    from src.routes.public import public_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(court_complex_bp, url_prefix='/api/court-complexes')
    app.register_blueprint(booking_bp, url_prefix='/api/booking')
    app.register_blueprint(owner_bp, url_prefix='/api/owner')
    app.register_blueprint(review_bp, url_prefix='/api/reviews')
    app.register_blueprint(notification_bp, url_prefix='/api/notifications')
    app.register_blueprint(public_bp, url_prefix='/api/public')

    # CÁC DECORATOR @app.route PHẢI ĐƯỢC ĐẶT TRONG HÀM create_app()
    # HOẶC SAU KHI 'app' ĐƯỢC TRẢ VỀ TỪ create_app() VÀ GÁN VÀO BIẾN 'app' TOÀN CỤC.
    # Tuy nhiên, vì chúng ta sẽ triển khai frontend riêng, các route này không cần thiết cho Render.
    # Bạn có thể giữ chúng cho mục đích phát triển cục bộ nếu muốn.
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

    return app

# Call create_app() to initialize the global 'app' instance and setup extensions/blueprints
app = create_app() # Gán instance app được trả về từ create_app() vào biến 'app' toàn cục

# Hàm tạo dữ liệu mặc định
def create_default_data(_app): # Sử dụng _app để tránh nhầm lẫn với biến app toàn cục
    with _app.app_context(): # Sử dụng _app được truyền vào
        from src.models.database import SportType, Amenity, User
        from werkzeug.security import generate_password_hash

        print("Checking for and creating default data...")
        if not SportType.query.first():
            sport_types = [
                SportType(name='Bóng đá'),
                SportType(name='Cầu lông'),
                SportType(name='Pickleball')
            ]
            for sport_type in sport_types:
                db.session.add(sport_type)
            print("Added default Sport Types.")

        if not Amenity.query.first():
            amenities = [
                Amenity(name='Bãi đỗ xe', icon='car'),
                Amenity(name='Phòng thay đồ', icon='shirt'),
                Amenity(name='Nhà vệ sinh', icon='toilet'),
                Amenity(name='Căng tin', icon='coffee'),
                Amenity(name='WiFi miễn phí', icon='wifi'),
                Amenity(name='Điều hòa', icon='air-conditioner'),
                Amenity(name='Tủ khóa', icon='lock'),
                Amenity(name='Đèn chiếu sáng ban đêm', icon='lightbulb'),
                Amenity(name='Sân có mái che', icon='umbrella'),
                Amenity(name='Ghế ngồi chờ', icon='chair'),
                Amenity(name='Nước uống miễn phí', icon='water'),
                Amenity(name='Huấn luyện viên hỗ trợ', icon='whistle'),
                Amenity(name='Hỗ trợ y tế / tủ thuốc', icon='first-aid'),
                Amenity(name='Sân đạt chuẩn thi đấu', icon='medal'),
                Amenity(name='Hệ thống thoát nước tốt', icon='droplet'),
                Amenity(name='Thân thiện người khuyết tật', icon='wheelchair')
            ]
            for amenity in amenities:
                db.session.add(amenity)
            print("Added default Amenities.")

        if not User.query.filter_by(role='Admin').first():
            password_hash = generate_password_hash('admin123')
            admin_user = User(
                fullName='Administrator',
                email='admin@courtbooking.com',
                passwordHash = password_hash,
                role='Admin',
                accountStatus=1
            )
            db.session.add(admin_user)
            print("Added default Admin User.")

        db.session.commit()
        print("Default data creation complete.")


if __name__ == '__main__':
    create_default_data(app) # Truyền app instance vào hàm tạo dữ liệu
    app.run(host='0.0.0.0', port=5000, debug=True)