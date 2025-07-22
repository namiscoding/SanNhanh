import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import QRCode from 'react-qr-code'; // Dùng cho fallback QR
import api from '@/lib/api';
import { Clock, MapPin, Calendar, CheckCircle, Copy, RefreshCw, Phone, Zap } from 'lucide-react'; // <<< THÊM Phone, Zap

const Payment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    fetchBookingDetail();
    
    // Auto refresh every 30 seconds to check payment status
    const interval = setInterval(() => {
      // Chỉ kiểm tra khi booking ở trạng thái Pending
      if (booking && booking.status === 'Pending') { 
        fetchBookingDetail();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [bookingId, booking]); // Add booking to dependency array for interval logic to work correctly

  const fetchBookingDetail = async () => {
    try {
      // Chỉ set loading true nếu đây là lần fetch đầu tiên hoặc đang kiểm tra thanh toán
      // Không set loading true nếu là auto refresh
      if (!booking || checkingPayment) setLoading(true); 

      const response = await api.get(`/booking/${bookingId}/payment-info`);
      setBooking(response.data.booking);
      setPaymentInfo(response.data.paymentInfo);
    } catch (error) {
      console.error('Error fetching booking detail:', error);
      // Xử lý lỗi: hiển thị thông báo, hoặc điều hướng nếu booking không tồn tại
      if (error.response && error.response.status === 404) {
          navigate('/my-bookings'); // Chuyển về trang lịch sử nếu booking không tồn tại
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkPaymentStatus = async () => {
    setCheckingPayment(true);
    try {
      await fetchBookingDetail(); // Gọi lại fetchBookingDetail để cập nhật trạng thái
    } finally {
      setCheckingPayment(false);
    }
  };

  const formatTime = (timeString) => {
    // Sửa lỗi: toLocaleTimeString cần Date object
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    // Sửa lỗi: toLocaleDateString cần Date object
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (price) => {
    // Đảm bảo price là number trước khi format
    if (typeof price !== 'number') price = parseFloat(price);
    if (isNaN(price)) price = 0;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0 // Không hiển thị số thập phân cho VND
    }).format(price);
  };

  // Hàm tạo link Zalo
  const generateZaloLink = (phoneNumber) => {
    if (!phoneNumber) return '#';
    // Xóa các ký tự không phải số và thêm '84' nếu là số nội địa
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    if (cleanedNumber.startsWith('0')) {
        return `https://zalo.me/${cleanedNumber.substring(1)}`; // Bỏ số 0 đầu tiên
    }
    return `https://zalo.me/${cleanedNumber}`; // Nếu đã có mã quốc gia
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!booking) { // Nếu booking là null sau khi tải và không có lỗi (ví dụ: 404 từ API)
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Không tìm thấy đơn đặt sân
          </h1>
          <Button onClick={() => navigate('/my-bookings')}>
            Xem lịch sử đặt sân
          </Button>
        </div>
      </div>
    );
  }

  // Nếu đã được xác nhận, hiển thị trang thành công
  if (booking.status === 'Confirmed') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Đặt sân thành công!
              </h1>
              <p className="text-gray-600 mb-6">
                Đơn đặt sân của bạn đã được xác nhận.
              </p>
              <div className="space-y-3">
                <Button onClick={() => navigate('/my-bookings')} className="w-full">
                  Xem lịch sử đặt sân
                </Button>
                <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                  Về trang chủ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- TRANG HƯỚNG DẪN THANH TOÁN (Trạng thái Pending) ---
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Hoàn tất thanh toán
          </h1>
          <p className="text-gray-600">
            Vui lòng chuyển khoản để xác nhận đơn đặt sân của bạn.
          </p>
        </div>

        {booking.status === 'Pending' && (
          <Alert className="mb-6 bg-yellow-50 border-yellow-200 text-yellow-800">
            <Clock className="w-4 h-4" />
            <AlertDescription>
              **Lưu ý:** Vui lòng hoàn tất thanh toán trong vòng 15 phút. Đơn đặt sẽ tự động hủy nếu không thanh toán đúng hạn.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment QR Code */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-center text-xl text-blue-700">
                Bước 1: Quét mã QR hoặc chuyển khoản thủ công
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {paymentInfo && paymentInfo.qr_url ? (
                <div className="bg-white p-4 rounded-lg inline-block mb-4 border border-gray-200">
                  <img
                    src={paymentInfo.qr_url}
                    alt="VietQR Code"
                    className="w-64 h-64 mx-auto"
                  />
                </div>
              ) : (
                <div className="bg-white p-4 rounded-lg inline-block mb-4 border border-gray-200">
                  <QRCode
                    value={`BOOKING: ${booking.id}\nAMOUNT: ${formatPrice(booking.totalPrice)}\nTO: ${booking.complexName}`}
                    size={256}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                  <p className="text-sm text-gray-500 mt-2">Mã QR cơ bản (thông tin cần nhập thủ công)</p>
                </div>
              )}
              <p className="text-sm text-gray-600 mb-4">
                Sử dụng ứng dụng ngân hàng của bạn để quét mã QR hoặc nhập thông tin bên dưới:
              </p>
              
              <div className="space-y-3 text-left bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Ngân hàng:</span>
                  <span className="font-medium">{paymentInfo?.bank_code || 'Chưa có thông tin'}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Số tài khoản:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{paymentInfo?.account_number || 'Chưa có thông tin'}</span>
                    {paymentInfo?.account_number && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(paymentInfo.account_number)}
                        className="p-1 h-auto"
                      >
                        <Copy className="w-4 h-4 text-gray-500 hover:text-blue-500" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Chủ tài khoản:</span>
                  <span className="font-medium">{paymentInfo?.account_name || 'Chưa có thông tin'}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Số tiền cần chuyển:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-blue-600 text-lg">{formatPrice(paymentInfo?.amount || booking.totalPrice)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(String(paymentInfo?.amount || booking.totalPrice))} // Ensure it's a string
                      className="p-1 h-auto"
                    >
                      <Copy className="w-4 h-4 text-gray-500 hover:text-blue-500" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Nội dung chuyển khoản:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{paymentInfo?.description || `SportSync ${booking.id}`}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(paymentInfo?.description || `SportSync ${booking.id}`)}
                      className="p-1 h-auto"
                    >
                      <Copy className="w-4 h-4 text-gray-500 hover:text-blue-500" />
                    </Button>
                  </div>
                </div>
              </div>

              {copied && (
                <Alert className="mt-4 bg-green-50 border-green-200 text-green-800">
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>Đã sao chép vào clipboard!</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={checkPaymentStatus}
                disabled={checkingPayment}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${checkingPayment ? 'animate-spin' : ''}`} />
                {checkingPayment ? 'Đang kiểm tra...' : 'Đã chuyển khoản - Kiểm tra lại trạng thái'}
              </Button>
            </CardContent>
          </Card>

          {/* Booking Details & Instructions */}
          <div className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center text-xl text-green-700">
                  <Calendar className="w-5 h-5 mr-2" />
                  Chi tiết đơn đặt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Mã đơn đặt</h3>
                  <p className="text-lg font-mono text-blue-600">#{booking.id}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Sân</h3>
                  <p className="font-medium">{booking.courtName}</p> {/* booking.courtName đã có từ API */}
                  <div className="flex items-center text-gray-600 text-sm">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{booking.complexName}</span> {/* booking.complexName đã có từ API */}
                  </div>
                  <p className="text-gray-500 text-sm">{booking.complexAddress}, {booking.complexCity}</p> {/* Thêm địa chỉ khu phức hợp */}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Thời gian</h3>
                  <p className="font-medium">{formatDate(booking.startTime)}</p>
                  <p className="text-gray-600">
                    {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Trạng thái</h3>
                  <Badge variant={booking.status === 'Pending' ? 'secondary' : 'default'}>
                    {booking.status === 'Pending' ? 'Chờ thanh toán' : booking.status}
                  </Badge>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Tổng tiền</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatPrice(booking.totalPrice)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center text-xl text-purple-700">
                        <Phone className="w-5 h-5 mr-2" />
                        Bước 2: Liên hệ hỗ trợ (nếu cần)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-700">
                        Sau khi chuyển khoản, đơn đặt sân của bạn sẽ được xác nhận tự động. 
                        Nếu sau vài phút vẫn chưa thấy trạng thái cập nhật, vui lòng liên hệ với chủ sân qua Zalo:
                    </p>
                    <div className="flex items-center justify-center space-x-4">
                        <Button 
                            onClick={() => window.open(generateZaloLink(booking.complexPhoneNumber), '_blank')}
                            disabled={!booking.complexPhoneNumber}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            <Zap className="w-5 h-5 mr-2" />
                            Nhắn Zalo chủ sân
                        </Button>
                    </div>
                    {booking.complexPhoneNumber && (
                        <p className="text-center text-sm text-gray-600">
                            Số điện thoại chủ sân: <span className="font-medium">{booking.complexPhoneNumber}</span>
                        </p>
                    )}
                    <p className="text-sm text-gray-600 mt-2">
                        Vui lòng gửi ảnh chụp màn hình giao dịch chuyển khoản qua Zalo để được hỗ trợ nhanh nhất.
                    </p>
                </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => navigate('/my-bookings')}>
            Xem lịch sử đặt sân
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Payment;