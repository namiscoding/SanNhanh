## Kế hoạch thực hiện nhiệm vụ

### Giai đoạn 1: Đọc và phân tích nội dung tệp đính kèm
- [x] Đọc tệp `pasted_content.txt` (cấu trúc CSDL).
- [x] Đọc tệp `pasted_content_2.txt` (yêu cầu triển khai và luồng chức năng).

### Giai đoạn 2: Xác định yêu cầu và lập kế hoạch thực hiện
- [x] Phân tích chi tiết các yêu cầu về công nghệ (tech stack).
- [x] Phân tích chi tiết các luồng chức năng cho từng vai trò (Admin, Customer, Owner).
- [ ] Lập kế hoạch triển khai cụ thể, chia nhỏ các công việc thành các bước thực hiện.

### Giai đoạn 3: Thực hiện nhiệm vụ theo yêu cầu
- [ ] Khởi tạo dự án Next.js với App Router.
- [ ] Cấu hình Prisma ORM với schema CSDL đã cho.
- [ ] Cài đặt và cấu hình Tailwind CSS và shadcn/ui.
- [ ] Triển khai xác thực người dùng với NextAuth.js (Auth.js) và tích hợp đăng nhập Google.
- [ ] Xây dựng các API routes và logic backend sử dụng Next.js App Router và Prisma.
- [ ] Phát triển giao diện người dùng (frontend) cho từng vai trò (Admin, Customer, Owner) dựa trên các luồng chức năng.
- [ ] Tích hợp thư viện qrcode.react để tạo mã VietQR.
- [ ] Tích hợp dịch vụ Resend để gửi email thông báo.
- [ ] Triển khai lên Vercel và cung cấp URL công khai.

### Giai đoạn 4: Báo cáo kết quả cho người dùng
- [ ] Cung cấp mã nguồn trên GitHub.
- [ ] Cung cấp URL website đã triển khai.
- [ ] Viết hướng dẫn sử dụng nhanh (file Markdown hoặc video ngắn) cho các luồng chính.




### Kế hoạch triển khai chi tiết:

#### Giai đoạn 3: Thực hiện nhiệm vụ theo yêu cầu

**Bước 3.1: Khởi tạo dự án và cấu hình cơ bản**- [x] Khởi tạo dự án React với TypeScript và Flask backend.
- [x] Cài đặt và cấu hình SQLAlchemy ORM, tạo models dựa trên cấu trúc CSDL đã cho.
- [x] Cài đặt và cấu hình Tailwind CSS và shadcn/ui.
- [x] Cài đặt JWT authentication và cấu hình Google Auth placeholder.

**Bước 3.2: Phát triển Backend (API Routes) với Flask và SQLAlchemy**
- [x] Xây dựng API cho xác thực người dùng (đăng ký/đăng nhập, Google Auth).
- [x] Xây dựng API cho quản lý người dùng (Admin: xem, thay đổi trạng thái, nâng cấp vai trò).
- [x] Xây dựng API cho quản lý khu phức hợp sân (Owner: CRUD CourtComplexes, Courts, HourlyPriceRates, Products, Amenities, BlockedCourtSlots).
- [x] Xây dựng API cho đặt sân (Customer: tạo Booking, tính toán TotalPrice).
- [x] Xây dựng API cho quản lý Booking (Owner: xác nhận/hủy, thêm BookingProducts, tính lại TotalPrice).

**Bước 3.3: Phát triển Frontend (UI) cho từng vai trò**
- [x] **Giao diện chung:**
    - [x] Trang chủ (tìm kiếm CourtComplexes).
    - [ ] Trang chi tiết khu phức hợp (thông tin, hình ảnh, tiện nghi, danh sách sân con, sản phẩm).
    - [x] Trang đăng ký/đăng nhập.
- [ ] **Giao diện Admin:**
    - [ ] Dashboard Admin (danh sách người dùng, chức năng nâng cấp vai trò).
- [ ] **Giao diện Customer:**
    - [ ] Luồng đặt sân (chọn sân, chọn giờ, xem tổng tiền).
    - [ ] Trang hướng dẫn thanh toán (hiển thị VietQR).
    - [ ] Lịch sử đặt sân.
- [ ] **Giao diện Owner:**
    - [ ] Dashboard Owner (quản lý CourtComplexes, Courts, giá, sản phẩm, lịch chặn).
    - [ ] Quản lý đơn đặt (xác nhận/hủy, thêm sản phẩm vào đơn).
    - [ ] Giao diện tổng kết hóa đơn.

**Bước 3.4: Tích hợp các thư viện và dịch vụ**
- [ ] Tích hợp `qrcode.react` để tạo mã VietQR trên frontend.
- [ ] Tích hợp Resend để gửi email thông báo (đặt sân mới, xác nhận, hủy).

**Bước 3.5: Triển khai và bàn giao**
- [ ] Triển khai ứng dụng lên Vercel.
- [ ] Tạo repository GitHub và đẩy mã nguồn lên.
- [ ] Viết hướng dẫn sử dụng nhanh (file Markdown) với ảnh chụp màn hình cho các luồng chính.


