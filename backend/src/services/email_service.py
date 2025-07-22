# src/services/email_service.py

import resend
import os
from datetime import datetime, timedelta # <<< Đảm bảo timedelta được import
import traceback # <<< Đảm bảo traceback được import

# Configure Resend
resend.api_key = os.getenv('RESEND_API_KEY', 'your-resend-api-key')

class EmailService:
    @staticmethod
    def send_booking_confirmation(user_email, user_name, booking_data):
        """Send booking confirmation email to customer after successful booking (Pending/Confirmed)."""
        try:
            start_time = datetime.fromisoformat(booking_data['startTime'].replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(booking_data['endTime'].replace('Z', '+00:00'))
            
            formatted_date = start_time.strftime('%d/%m/%Y')
            formatted_start_time = start_time.strftime('%H:%M')
            formatted_end_time = end_time.strftime('%H:%M')
            
            # Format price for display in email
            total_price_formatted = f"{booking_data['totalPrice']:,}đ"

            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Xác nhận đặt sân</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; }}
                    h1 {{ margin: 0; padding: 0; }}
                    h2 {{ margin-top: 5px; }}
                    .content {{ padding: 20px; background: #f9f9f9; }}
                    .booking-details {{ background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 0.9em; }}
                    .button {{ display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; }}
                    strong {{ color: #2563eb; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SportSync</h1>
                        <h2>Xác nhận đặt sân thành công</h2>
                    </div>
                    
                    <div class="content">
                        <p>Xin chào <strong>{user_name}</strong>,</p>
                        
                        <p>Cảm ơn bạn đã sử dụng dịch vụ của SportSync. Đơn đặt sân của bạn đã được ghi nhận.</p>
                        <p>Tùy thuộc vào phương thức thanh toán, đơn của bạn có thể ở trạng thái chờ xác nhận.</p>
                        
                        <div class="booking-details">
                            <h3>Chi tiết đặt sân</h3>
                            <p><strong>Mã đơn:</strong> #{booking_data['id']}</p>
                            <p><strong>Sân:</strong> {booking_data.get('courtName', 'N/A')}</p>
                            <p><strong>Khu phức hợp:</strong> {booking_data.get('complexName', 'N/A')}</p>
                            <p><strong>Địa chỉ:</strong> {booking_data.get('complexAddress', 'N/A')}, {booking_data.get('complexCity', 'N/A')}</p>
                            <p><strong>Ngày:</strong> {formatted_date}</p>
                            <p><strong>Thời gian:</strong> {formatted_start_time} - {formatted_end_time}</p>
                            <p><strong>Tổng tiền:</strong> {total_price_formatted}</p>
                            <p><strong>Trạng thái:</strong> <span style="color: #2563eb; font-weight: bold;">{booking_data.get('status', 'Pending')}</span></p>
                        </div>
                        
                        <p>Vui lòng đến sân đúng giờ và mang theo mã đơn để check-in.</p>
                        
                        <p>Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi qua:</p>
                        <ul>
                            <li>Email: support@sannhanh.online</li>
                            <li>Hotline: 0823281223</li>
                        </ul>
                    </div>
                    
                    <div class="footer">
                        <p>Cảm ơn bạn đã tin tưởng SportSync!</p>
                        <p>© 2025 SportSync. Tất cả quyền được bảo lưu.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            params = {
                "from": "SportSync <noreply@sannhanh.online>",
                "to": [user_email],
                "subject": f"Xác nhận đặt sân #{booking_data['id']} - SportSync",
                "html": html_content,
            }
            
            email = resend.Emails.send(params)
            return {"success": True, "email_id": email.get('id')}
            
        except Exception as e:
            print(f"Error sending booking confirmation email: {str(e)}")
            traceback.print_exc()
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def send_booking_cancellation(user_email, user_name, booking_data):
        """Send booking cancellation email to customer."""
        try:
            start_time = datetime.fromisoformat(booking_data['startTime'].replace('Z', '+00:00'))
            formatted_date = start_time.strftime('%d/%m/%Y')
            formatted_start_time = start_time.strftime('%H:%M')
            formatted_end_time = datetime.fromisoformat(booking_data['endTime'].replace('Z', '+00:00')).strftime('%H:%M')

            total_price_formatted = f"{booking_data['totalPrice']:,}đ"

            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Hủy đặt sân</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #dc2626; color: white; padding: 20px; text-align: center; }}
                    h1 {{ margin: 0; padding: 0; }}
                    h2 {{ margin-top: 5px; }}
                    .content {{ padding: 20px; background: #f9f9f9; }}
                    .booking-details {{ background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 0.9em; }}
                    strong {{ color: #dc2626; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SportSync</h1>
                        <h2>Thông báo hủy đặt sân</h2>
                    </div>
                    
                    <div class="content">
                        <p>Xin chào <strong>{user_name}</strong>,</p>
                        
                        <p>Đơn đặt sân của bạn với mã <strong>#{booking_data['id']}</strong> đã được hủy.</p>
                        <p>Thông tin chi tiết:</p>
                        
                        <div class="booking-details">
                            <h3>Chi tiết đơn đã hủy</h3>
                            <p><strong>Mã đơn:</strong> #{booking_data['id']}</p>
                            <p><strong>Sân:</strong> {booking_data.get('courtName', 'N/A')}</p>
                            <p><strong>Khu phức hợp:</strong> {booking_data.get('complexName', 'N/A')}</p>
                            <p><strong>Ngày:</strong> {formatted_date}</p>
                            <p><strong>Thời gian:</strong> {formatted_start_time} - {formatted_end_time}</p>
                            <p><strong>Tổng tiền:</strong> {total_price_formatted}</p>
                        </div>
                        
                        <p>Lý do hủy: {booking_data.get('cancellationReason', 'Không rõ lý do')}</p>
                        <p>Số tiền sẽ được hoàn lại trong vòng 3-5 ngày làm việc (nếu có chính sách hoàn tiền áp dụng).</p>
                        
                        <p>Cảm ơn bạn đã sử dụng dịch vụ của SportSync!</p>
                    </div>
                    
                    <div class="footer">
                        <p>© 2025 SportSync. Tất cả quyền được bảo lưu.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            params = {
                "from": "SportSync <noreply@sannhanh.online>",
                "to": [user_email],
                "subject": f"Đơn đặt sân #{booking_data['id']} đã hủy - SportSync",
                "html": html_content,
            }
            
            email = resend.Emails.send(params)
            return {"success": True, "email_id": email.get('id')}
            
        except Exception as e:
            print(f"Error sending cancellation email: {str(e)}")
            traceback.print_exc()
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def send_welcome_email(user_email, user_name):
        """Send welcome email to new users"""
        try:
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Chào mừng đến với SportSync</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; }}
                    h1 {{ margin: 0; padding: 0; }}
                    h2 {{ margin-top: 5px; }}
                    .content {{ padding: 20px; background: #f9f9f9; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 0.9em; }}
                    .button {{ display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; }}
                    strong {{ color: #2563eb; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SportSync</h1>
                        <h2>Chào mừng bạn đến với SportSync!</h2>
                    </div>
                    
                    <div class="content">
                        <p>Xin chào <strong>{user_name}</strong>,</p>
                        
                        <p>Cảm ơn bạn đã đăng ký tài khoản tại SportSync - hệ thống đặt sân thể thao hàng đầu Việt Nam!</p>
                        
                        <p>Với SportSync, bạn có thể:</p>
                        <ul>
                            <li>Tìm kiếm sân thể thao theo vị trí và loại hình</li>
                            <li>Đặt sân online nhanh chóng và tiện lợi</li>
                            <li>Thanh toán an toàn qua VietQR</li>
                            <li>Quản lý lịch đặt sân dễ dàng</li>
                        </ul>
                        
                        <p>Hãy bắt đầu trải nghiệm ngay hôm nay!</p>
                        
                        <p style="text-align: center;">
                            <a href="https://sannhanh.online" class="button">Khám phá SportSync</a>
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>Nếu có thắc mắc, liên hệ: support@sannhanh.online | 0823281223</p>
                        <p>© 2025 SportSync. Tất cả quyền được bảo lưu.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            params = {
                "from": "SportSync <noreply@sannhanh.online>",
                "to": [user_email],
                "subject": "Chào mừng đến với SportSync!",
                "html": html_content,
            }
            
            email = resend.Emails.send(params)
            return {"success": True, "email_id": email.get('id')}
            
        except Exception as e:
            print(f"Error sending welcome email: {str(e)}")
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    @staticmethod
    def send_new_booking_notification_to_owner(owner_email, owner_name, booking_data):
        """Send notification email to owner about a new booking."""
        try:
            start_time = datetime.fromisoformat(booking_data['startTime'].replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(booking_data['endTime'].replace('Z', '+00:00'))
            
            formatted_date = start_time.strftime('%d/%m/%Y')
            formatted_start_time = start_time.strftime('%H:%M')
            formatted_end_time = end_time.strftime('%H:%M')
            
            total_price_formatted = f"{booking_data['totalPrice']:,}đ"

            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Thông báo đặt sân mới - SportSync</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #10b981; color: white; padding: 20px; text-align: center; }}
                    h1 {{ margin: 0; padding: 0; }}
                    h2 {{ margin-top: 5px; }}
                    .content {{ padding: 20px; background: #f9f9f9; }}
                    .booking-details {{ background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 0.9em; }}
                    .button {{ display: inline-block; padding: 10px 20px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; }}
                    strong {{ color: #10b981; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SportSync</h1>
                        <h2>Đơn đặt sân mới về sân của bạn!</h2>
                    </div>
                    
                    <div class="content">
                        <p>Xin chào <strong>{owner_name}</strong>,</p>
                        
                        <p>Bạn có một đơn đặt sân mới cần được xem xét và xác nhận:</p>
                        
                        <div class="booking-details">
                            <h3>Chi tiết đơn đặt</h3>
                            <p><strong>Mã đơn:</strong> #{booking_data['id']}</p>
                            <p><strong>Sân:</strong> {booking_data.get('courtName', 'N/A')}</p>
                            <p><strong>Khu phức hợp:</strong> {booking_data.get('complexName', 'N/A')}</p>
                            <p><strong>Khách hàng:</strong> {booking_data.get('customerName', 'N/A')} ({booking_data.get('customerEmail', 'N/A')})</p>
                            <p><strong>Ngày:</strong> {formatted_date}</p>
                            <p><strong>Thời gian:</strong> {formatted_start_time} - {formatted_end_time}</p>
                            <p><strong>Tổng tiền:</strong> {total_price_formatted}</p>
                            <p><strong>Trạng thái:</strong> <span style="color: #10b981; font-weight: bold;">{booking_data.get('status', 'Pending')}</span></p>
                        </div>
                        
                        <p>Vui lòng truy cập trang quản lý đơn đặt sân của bạn để xem chi tiết và xử lý đơn này:</p>
                        <p style="text-align: center;">
                            <a href="https://sannhanh.online/owner-dashboard/bookings" class="button">Quản lý đơn đặt sân</a>
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>Cảm ơn bạn đã hợp tác với SportSync!</p>
                        <p>© 2025 SportSync. Tất cả quyền được bảo lưu.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            params = {
                "from": "SportSync <noreply@sannhanh.online>",
                "to": [owner_email],
                "subject": f"Đơn đặt sân mới #{booking_data['id']} - SportSync",
                "html": html_content,
            }
            
            email = resend.Emails.send(params)
            return {"success": True, "email_id": email.get('id')}
            
        except Exception as e:
            print(f"Error sending new booking notification to owner: {str(e)}")
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    @staticmethod
    def send_booking_status_update_to_customer(customer_email, customer_name, booking_data, new_status, reason=None):
        """Send email to customer when booking status is updated (Approved/Rejected)."""
        try:
            start_time = datetime.fromisoformat(booking_data['startTime'].replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(booking_data['endTime'].replace('Z', '+00:00'))
            
            formatted_date = start_time.strftime('%d/%m/%Y')
            formatted_start_time = start_time.strftime('%H:%M')
            formatted_end_time = end_time.strftime('%H:%M')
            
            total_price_formatted = f"{booking_data['totalPrice']:,}đ"

            status_color = "#10b981" # Green for Approved
            status_text = "đã được xác nhận"
            if new_status == 'Rejected':
                status_color = "#dc2626" # Red for Rejected
                status_text = "đã bị từ chối"

            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Cập nhật trạng thái đơn đặt sân - SportSync</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: {status_color}; color: white; padding: 20px; text-align: center; }}
                    h1 {{ margin: 0; padding: 0; }}
                    h2 {{ margin-top: 5px; }}
                    .content {{ padding: 20px; background: #f9f9f9; }}
                    .booking-details {{ background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 0.9em; }}
                    .button {{ display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; }}
                    strong {{ color: {status_color}; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SportSync</h1>
                        <h2>Đơn đặt sân của bạn {status_text}!</h2>
                    </div>
                    
                    <div class="content">
                        <p>Xin chào <strong>{customer_name}</strong>,</p>
                        
                        <p>Chúng tôi xin thông báo trạng thái đơn đặt sân <strong>#{booking_data['id']}</strong> của bạn {status_text}.</p>
                        
                        <div class="booking-details">
                            <h3>Chi tiết đơn đặt</h3>
                            <p><strong>Mã đơn:</strong> #{booking_data['id']}</p>
                            <p><strong>Sân:</strong> {booking_data.get('courtName', 'N/A')}</p>
                            <p><strong>Khu phức hợp:</strong> {booking_data.get('complexName', 'N/A')}</p>
                            <p><strong>Ngày:</strong> {formatted_date}</p>
                            <p><strong>Thời gian:</strong> {formatted_start_time} - {formatted_end_time}</p>
                            <p><strong>Tổng tiền:</strong> {total_price_formatted}</p>
                            <p><strong>Trạng thái mới:</strong> <span style="color: {status_color}; font-weight: bold;">{new_status}</span></p>
                            {reason and f"<p><strong>Lý do:</strong> {reason}</p>"}
                        </div>
                        
                        <p>Bạn có thể kiểm tra chi tiết đơn đặt sân của mình tại đây:</p>
                        <p style="text-align: center;">
                            <a href="https://sannhanh.online/my-bookings" class="button">Xem đơn đặt của tôi</a>
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>Cảm ơn bạn đã tin tưởng SportSync!</p>
                        <p>© 2025 SportSync. Tất cả quyền được bảo lưu.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            params = {
                "from": "SportSync <noreply@sannhanh.online>",
                "to": [customer_email],
                "subject": f"Trạng thái đơn #{booking_data['id']} {status_text} - SportSync",
                "html": html_content,
            }
            
            email = resend.Emails.send(params)
            return {"success": True, "email_id": email.get('id')}
            
        except Exception as e:
            print(f"Error sending booking status update email: {str(e)}")
            traceback.print_exc()
            return {"success": False, "error": str(e)}