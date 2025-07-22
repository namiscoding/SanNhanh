# Hướng dẫn triển khai hệ thống đặt sân thể thao

## 🌐 URL Production
**Website:** https://vgh0i1co5yy3.manus.space

## 🔐 Tài khoản demo
- **Admin:** admin@courtbooking.com / admin123
- **Customer:** Đăng ký mới hoặc dùng Google OAuth

## 📁 Cấu trúc dự án

```
court-booking-system/
├── backend/                 # Flask API server
│   ├── src/
│   │   ├── main.py         # Entry point
│   │   ├── models/         # Database models
│   │   ├── routes/         # API endpoints
│   │   └── services/       # Email service
│   ├── static/             # Frontend build files
│   └── requirements.txt    # Python dependencies
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   └── lib/            # Utilities
│   ├── dist/               # Build output
│   └── package.json        # Node dependencies
└── README.md
```

## 🚀 Triển khai local

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
pip install -r requirements.txt
python src/main.py
```

### Frontend
```bash
cd frontend
pnpm install
pnpm run dev
```

## 🔧 Biến môi trường

### Backend (.env)
```
FLASK_ENV=production
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///court_booking.db
JWT_SECRET_KEY=your-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
RESEND_API_KEY=your-resend-api-key
```

### Frontend (.env)
```
VITE_API_BASE_URL=https://vgh0i1co5yy3.manus.space
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## 📊 Database Schema

### Bảng chính:
- **users** - Người dùng (Customer, Owner, Admin)
- **court_complexes** - Khu phức hợp sân
- **courts** - Sân thể thao
- **bookings** - Đơn đặt sân
- **sport_types** - Loại hình thể thao
- **amenities** - Tiện ích
- **products** - Sản phẩm/dịch vụ
- **reviews** - Đánh giá

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - Đăng ký
- `POST /auth/login` - Đăng nhập
- `POST /auth/google` - Google OAuth
- `GET /auth/me` - Thông tin user hiện tại

### Admin
- `GET /admin/users` - Danh sách người dùng
- `PUT /admin/users/{id}/role` - Cập nhật vai trò
- `PUT /admin/users/{id}/status` - Cập nhật trạng thái

### Court Complex
- `GET /court-complexes` - Danh sách khu phức hợp
- `GET /court-complexes/{id}` - Chi tiết khu phức hợp
- `POST /court-complexes` - Tạo khu phức hợp mới

### Booking
- `POST /bookings` - Tạo đơn đặt sân
- `GET /bookings/my-bookings` - Lịch sử đặt sân
- `GET /bookings/{id}` - Chi tiết đơn đặt
- `PUT /bookings/{id}/cancel` - Hủy đơn đặt

## 🎨 Frontend Pages

### Public
- `/` - Trang chủ với tìm kiếm
- `/login` - Đăng nhập
- `/register` - Đăng ký

### Customer
- `/my-bookings` - Lịch sử đặt sân
- `/court-complex/{id}` - Chi tiết khu phức hợp
- `/booking/{courtId}` - Đặt sân
- `/payment/{bookingId}` - Thanh toán

### Admin
- `/admin` - Dashboard quản trị

## 💳 Thanh toán VietQR

Hệ thống tích hợp VietQR cho thanh toán:
- Tạo QR code tự động
- Thông tin chuyển khoản chi tiết
- Copy thông tin nhanh
- Kiểm tra trạng thái thanh toán

## 📧 Email Service

Sử dụng Resend để gửi email:
- Email chào mừng người dùng mới
- Email xác nhận đặt sân
- Email hủy đặt sân

## 🔐 Google OAuth

Tích hợp đăng nhập Google:
- Đăng nhập nhanh chóng
- Tự động tạo tài khoản
- Đồng bộ thông tin profile

## 📱 Responsive Design

- Mobile-first design
- Tailwind CSS
- Shadcn/ui components
- Touch-friendly interface

## 🛠️ Tech Stack

### Backend
- Flask (Python web framework)
- SQLAlchemy (ORM)
- Flask-JWT-Extended (Authentication)
- Flask-CORS (Cross-origin requests)
- Google Auth Library
- Resend (Email service)

### Frontend
- React 19
- Vite (Build tool)
- Tailwind CSS (Styling)
- Shadcn/ui (UI components)
- React Router (Routing)
- Axios (HTTP client)
- Lucide React (Icons)

### Deployment
- Manus Cloud (Production hosting)
- SQLite (Database)
- Static file serving

## 🔄 CI/CD

Để cập nhật production:

1. **Build frontend:**
   ```bash
   cd frontend
   pnpm run build
   cp -r dist/* ../backend/static/
   ```

2. **Deploy backend:**
   ```bash
   # Sử dụng Manus deployment service
   manus deploy backend/
   ```

## 📞 Hỗ trợ

- **Email:** support@sportcourt.vn
- **Hotline:** 1900 1234
- **Documentation:** Xem README.md

---

**© 2024 SportCourt. Tất cả quyền được bảo lưu.**

