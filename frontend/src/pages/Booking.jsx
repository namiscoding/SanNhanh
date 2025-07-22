import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, Clock, MapPin, DollarSign, User, 
  CheckCircle, AlertCircle, ArrowLeft 
} from 'lucide-react';
import api from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

export default function Booking() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();
  
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [complex, setComplex] = useState(null);
  const [court, setCourt] = useState(null);
  const [step, setStep] = useState(1); // 1: Confirm, 2: Payment, 3: Success
  const [bookingId, setBookingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!location.state?.bookingData) {
      navigate('/');
      return;
    }

    setBookingData(location.state.bookingData);
    fetchBookingDetails(location.state.bookingData);
  }, [location.state, user, navigate]);

  const fetchBookingDetails = async (data) => {
    try {
      const [complexResponse, courtResponse] = await Promise.all([
        api.get(`/public/court-complexes/${data.complexId}`),
        api.get(`/public/court-complexes/${data.complexId}/courts/${data.courtId}`)
      ]);
      
      setComplex(complexResponse.data);
      setCourt(courtResponse.data);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setError('Không thể tải thông tin đặt sân.');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleConfirmBooking = async () => {
    if (!bookingData || !user) return;

    try {
      setLoading(true);
      setError('');

      const response = await api.post('/bookings', {
        courtId: bookingData.courtId,
        date: bookingData.date,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        totalAmount: bookingData.price
      });

      setBookingId(response.data.booking.id);
      setStep(2); // Move to payment step
    } catch (error) {
      console.error('Error creating booking:', error);
      setError(error.response?.data?.message || 'Có lỗi xảy ra khi đặt sân.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = () => {
    setStep(3); // Move to success step
  };

  if (!bookingData || !complex || !court) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải thông tin...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 1 && 'Xác nhận đặt sân'}
            {step === 2 && 'Thanh toán'}
            {step === 3 && 'Đặt sân thành công'}
          </h1>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${step >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}>
                {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className="ml-2 font-medium">Xác nhận</span>
            </div>
            
            <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-green-600' : 'bg-gray-200'}`}></div>
            
            <div className={`flex items-center ${step >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}>
                {step > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <span className="ml-2 font-medium">Thanh toán</span>
            </div>
            
            <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-green-600' : 'bg-gray-200'}`}></div>
            
            <div className={`flex items-center ${step >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}>
                {step >= 3 ? <CheckCircle className="w-5 h-5" /> : '3'}
              </div>
              <span className="ml-2 font-medium">Hoàn thành</span>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: Booking Confirmation */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin đặt sân</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="font-medium">{complex.name}</div>
                    <div className="text-sm text-gray-600">{complex.address}, {complex.city}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium">Sân: {court.name}</div>
                    <div className="text-sm text-gray-600">Loại: {complex.sportType}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium">{formatDate(bookingData.date)}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium">
                      {bookingData.startTime} - {bookingData.endTime}
                    </div>
                    <div className="text-sm text-gray-600">
                      Thời gian: 1 giờ
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-lg text-green-600">
                      {formatPrice(bookingData.price)}
                    </div>
                    <div className="text-sm text-gray-600">Tổng tiền</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin khách hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div><span className="font-medium">Họ tên:</span> {user.fullName}</div>
                  <div><span className="font-medium">Email:</span> {user.email}</div>
                  <div><span className="font-medium">Số điện thoại:</span> {user.phoneNumber || 'Chưa cập nhật'}</div>
                </div>
              </CardContent>
            </Card>

            {/* Terms */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>Lưu ý quan trọng:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Vui lòng thanh toán trong vòng 15 phút để giữ chỗ</li>
                    <li>Có thể hủy đặt sân trước 2 giờ mà không mất phí</li>
                    <li>Vui lòng đến sân đúng giờ đã đặt</li>
                    <li>Liên hệ chủ sân qua số điện thoại: {complex.phoneNumber}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleConfirmBooking}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận đặt sân'}
            </Button>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && bookingId && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Thanh toán qua QR Code</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="bg-gray-100 p-8 rounded-lg mb-4">
                    <div className="text-gray-500 mb-4">
                      <DollarSign className="w-16 h-16 mx-auto mb-2" />
                      <p>QR Code thanh toán sẽ hiển thị ở đây</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p><strong>Số tiền:</strong> {formatPrice(bookingData.price)}</p>
                    <p><strong>Mã đặt sân:</strong> #{bookingId}</p>
                    <p><strong>Nội dung chuyển khoản:</strong> SPORTSYNC {bookingId}</p>
                  </div>
                  
                  <Alert className="mt-4 text-left">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Hướng dẫn thanh toán:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Mở ứng dụng ngân hàng trên điện thoại</li>
                        <li>Quét mã QR hoặc chuyển khoản theo thông tin trên</li>
                        <li>Nhập đúng nội dung chuyển khoản</li>
                        <li>Xác nhận giao dịch</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="mt-6 space-y-3">
                    <Button
                      onClick={handlePaymentComplete}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Tôi đã thanh toán
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => navigate('/my-bookings')}
                      className="w-full"
                    >
                      Thanh toán sau
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="text-center space-y-6">
            <div className="text-green-600">
              <CheckCircle className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Đặt sân thành công!</h2>
              <p className="text-gray-600">
                Cảm ơn bạn đã sử dụng dịch vụ SportSync
              </p>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <p><strong>Mã đặt sân:</strong> #{bookingId}</p>
                  <p><strong>Trạng thái:</strong> <span className="text-yellow-600">Chờ xác nhận</span></p>
                  <p><strong>Thời gian:</strong> {formatDate(bookingData.date)} - {bookingData.startTime} đến {bookingData.endTime}</p>
                  <p><strong>Sân:</strong> {court.name} - {complex.name}</p>
                </div>
              </CardContent>
            </Card>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Bước tiếp theo:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Chủ sân sẽ xác nhận đặt sân của bạn trong vòng 30 phút</li>
                  <li>Bạn sẽ nhận được thông báo qua email</li>
                  <li>Có thể kiểm tra trạng thái trong mục "Lịch sử đặt sân"</li>
                  <li>Liên hệ chủ sân: {complex.phoneNumber} nếu cần hỗ trợ</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/my-bookings')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Xem lịch sử đặt sân
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full"
              >
                Về trang chủ
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

