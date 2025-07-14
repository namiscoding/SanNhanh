# Hệ thống đặt sân thể thao

Một ứng dụng web hoàn chỉnh cho việc đặt sân thể thao với React frontend và Flask backend.

## Tính năng chính

### Vai trò Admin
- Quản lý người dùng (xem, khóa/mở khóa tài khoản)
- Nâng cấp Customer thành Owner
- Quản lý cấu hình hệ thống

### Vai trò Customer (Khách hàng)
- Đăng ký/đăng nhập (bao gồm Google OAuth)
- Tìm kiếm khu phức hợp sân theo loại hình thể thao, thành phố
- Xem chi tiết sân, tiện nghi, sản phẩm
- Đặt sân và thanh toán qua VietQR
- Xem lịch sử đặt sân

### Vai trò Owner (Chủ sân)
- Quản lý khu phức hợp sân (tạo, sửa, xóa)
- Quản lý sân con và bảng giá theo giờ
- Quản lý sản phẩm/dịch vụ
- Xác nhận/hủy đơn đặt sân
- Thêm sản phẩm vào đơn đặt và tính hóa đơn

## Công nghệ sử dụng

### Backend
- **Flask**: Web framework
- **SQLAlchemy**: ORM cho database
- **Flask-JWT-Extended**: Xác thực JWT
- **Flask-CORS**: Hỗ trợ CORS
- **bcrypt**: Mã hóa mật khẩu
- **SQLite**: Database (có thể thay đổi thành PostgreSQL/MySQL)

### Frontend
- **React 19**: UI framework
- **React Router**: Routing
- **Tailwind CSS**: Styling
- **shadcn/ui**: Component library
- **Axios**: HTTP client
- **Lucide React**: Icons
- **qrcode.react**: Tạo mã QR

## Cài đặt và chạy

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# hoặc venv\Scripts\activate  # Windows
pip install -r requirements.txt
python src/main.py
```

Backend sẽ chạy trên http://localhost:5000

### Frontend

```bash
cd frontend
pnpm install
pnpm run dev
```

Frontend sẽ chạy trên http://localhost:5173

## Tài khoản mặc định

**Admin:**
- Email: admin@courtbooking.com
- Mật khẩu: admin123

## Cấu trúc dự án

```
court-booking-system/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   └── database.py      # Database models
│   │   ├── routes/
│   │   │   ├── auth.py          # Authentication routes
│   │   │   ├── admin.py         # Admin routes
│   │   │   ├── court_complex.py # Court complex routes
│   │   │   └── booking.py       # Booking routes
│   │   └── main.py              # Main application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # UI components
│   │   │   └── Layout.jsx       # Main layout
│   │   ├── pages/
│   │   │   ├── Home.jsx         # Homepage
│   │   │   ├── Login.jsx        # Login page
│   │   │   └── Register.jsx     # Register page
│   │   ├── lib/
│   │   │   ├── api.js           # API configuration
│   │   │   └── auth.js          # Auth utilities
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/google` - Đăng nhập Google
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Admin
- `GET /api/admin/users` - Lấy danh sách users
- `PUT /api/admin/users/{id}/status` - Cập nhật trạng thái user
- `PUT /api/admin/users/{id}/upgrade-to-owner` - Nâng cấp thành Owner

### Court Complex
- `GET /api/court-complexes` - Lấy danh sách khu phức hợp
- `GET /api/court-complexes/{id}` - Chi tiết khu phức hợp
- `POST /api/court-complexes` - Tạo khu phức hợp mới
- `GET /api/court-complexes/my-complexes` - Khu phức hợp của Owner

### Booking
- `GET /api/bookings/courts/{id}/availability` - Xem lịch trống
- `POST /api/bookings` - Tạo đơn đặt
- `GET /api/bookings/my-bookings` - Lịch sử đặt sân
- `PUT /api/bookings/{id}/confirm` - Xác nhận đơn đặt
- `PUT /api/bookings/{id}/cancel` - Hủy đơn đặt

## Luồng nghiệp vụ

### Luồng đặt sân (Customer)
1. Tìm kiếm khu phức hợp sân
2. Xem chi tiết và chọn sân
3. Chọn khung giờ trống
4. Tạo đơn đặt
5. Nhận mã VietQR để thanh toán
6. Chờ Owner xác nhận

### Luồng xác nhận đơn (Owner)
1. Nhận thông báo đơn đặt mới
2. Kiểm tra thanh toán
3. Xác nhận hoặc hủy đơn
4. Thêm sản phẩm/dịch vụ (nếu có)
5. Tính tổng hóa đơn cuối cùng

## Triển khai

Dự án có thể được triển khai lên:
- **Frontend**: Vercel, Netlify
- **Backend**: Heroku, Railway, DigitalOcean
- **Database**: PostgreSQL, MySQL

## Tính năng sắp tới

- [ ] Tích hợp Google OAuth hoàn chỉnh
- [ ] Gửi email thông báo
- [ ] Upload hình ảnh
- [ ] Báo cáo thống kê
- [ ] Ứng dụng mobile
- [ ] Thanh toán online

## Đóng góp

Mọi đóng góp đều được chào đón. Vui lòng tạo issue hoặc pull request.

## Giấy phép

MIT License

