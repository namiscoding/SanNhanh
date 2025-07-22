import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import { 
  ArrowLeft, Calendar, DollarSign, AlertCircle, User, Phone, Loader2,
  Building2, Clock as ClockIcon, Search, CheckCircle as CheckCircleIcon, 
} from 'lucide-react'; 
import api from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

export default function WalkInBooking() {
  const navigate = useNavigate();
  const user = getStoredUser();
  
  const [loading, setLoading] = useState(true); 
  const [selectedComplexData, setSelectedComplexData] = useState(null); // Chi tiết của complex được chọn
  const [error, setError] = useState(''); // Lỗi chung khi tải data hoặc submit
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date(); 
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedCourtId, setSelectedCourtId] = useState(''); // ID của sân được chọn
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState(0); // Giá ước tính
  const [bookingError, setBookingError] = useState(''); // Lỗi cụ thể của booking
  const [checkingPrice, setCheckingPrice] = useState(false); // Đang kiểm tra giá
  const [submitting, setSubmitting] = useState(false); // State khi submit booking
  const [success, setSuccess] = useState(''); // Thông báo thành công

  // 1. Fetch danh sách tổng quan complex của owner và tự động chọn
  useEffect(() => {
    const fetchOwnerComplexOverview = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/owner/court-complexes');
        const complexesOverview = response.data.courtComplexes || [];

        if (complexesOverview.length === 0) {
          setError('Bạn chưa có khu phức hợp sân nào. Vui lòng tạo một khu phức hợp để đặt sân.');
          setSelectedComplexData(null); 
          return;
        }

        const firstComplex = complexesOverview[0];
        // Lưu thông tin tổng quan của complex đầu tiên.
        // Danh sách sân con sẽ được fetch riêng trong useEffect tiếp theo.
        setSelectedComplexData(firstComplex); 

      } catch (err) {
        console.error('Error fetching owner complexes overview:', err.response?.data?.error || err.message || err);
        setError('Không thể tải thông tin khu phức hợp sân của bạn.');
        setSelectedComplexData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchOwnerComplexOverview();
  }, []); // Chạy một lần khi component mount

  // 2. Fetch chi tiết courts khi complex đã được chọn (và có ID)
  useEffect(() => {
    const fetchCourtsForSelectedComplex = async () => {
      if (!selectedComplexData || !selectedComplexData.id) {
        setSelectedCourtId(''); 
        return;
      }
      setLoading(true); // Bắt đầu loading cho complex detail / courts
      setError(''); 
      try {
        // Gọi API ĐỂ LẤY DANH SÁCH COURTS CỦA COMPLEX NÀY
        const response = await api.get(`/owner/court-complexes/${selectedComplexData.id}/courts`);
        const fetchedCourts = response.data.courts || [];

        setSelectedComplexData(prev => ({ // Cập nhật selectedComplexData với danh sách sân
            ...prev,
            courts: fetchedCourts
        }));

        if (fetchedCourts.length > 0) {
          setSelectedCourtId(fetchedCourts[0].id.toString()); // Tự động chọn sân đầu tiên
        } else {
          setSelectedCourtId('');
          setError('Khu phức hợp này chưa có sân nào được tạo. Vui lòng thêm sân.');
        }
      } catch (err) {
        console.error('Error fetching complex courts:', err.response?.data?.error || err.message || err);
        setError('Không thể tải danh sách sân cho khu phức hợp này.');
        setSelectedComplexData(prev => ({ ...prev, courts: [] })); // Clear courts if error
      } finally {
        setLoading(false); // Kết thúc loading
      }
    };

    if (selectedComplexData && selectedComplexData.id) {
        // Chỉ fetch courts nếu selectedComplexData đã có ID
        // và nó chưa có thuộc tính courts (hoặc courts là null/undefined)
        // để tránh fetch lại nếu courts đã được load
        if (!selectedComplexData.courts) { // Hoặc check if (!selectedComplexData.courtsLoaded) if you add a flag
            fetchCourtsForSelectedComplex();
        } else {
            setLoading(false); // Nếu đã có courts, chỉ set loading false
        }
    }

  }, [selectedComplexData]); // Chạy lại khi selectedComplexData thay đổi

  // 3. Check availability and price
  useEffect(() => {
    // Đảm bảo selectedComplexData.courts và selectedComplexData.id tồn tại trước khi check availability
    if (selectedComplexData && selectedComplexData.id && 
        selectedComplexData.courts && selectedComplexData.courts.length > 0 &&
        selectedCourtId && startTime && endTime && selectedDate && !error && !loading) { 
      checkAvailabilityAndPrice();
    } else {
      setEstimatedPrice(0);
      if (!selectedComplexData || !selectedComplexData.id || !selectedComplexData.courts || selectedComplexData.courts.length === 0) {
          setBookingError(''); 
      }
    }
  }, [selectedCourtId, startTime, endTime, selectedDate, selectedComplexData, error, loading]);

  const checkAvailabilityAndPrice = async () => {
    try {
      setCheckingPrice(true);
      setBookingError('');
      
      if (!selectedCourtId || !startTime || !endTime || !selectedDate) {
          setBookingError('Vui lòng chọn đầy đủ thông tin để kiểm tra giá.');
          setEstimatedPrice(0);
          return;
      }
      if (startTime >= endTime) {
          setBookingError('Thời gian kết thúc phải sau thời gian bắt đầu.');
          setEstimatedPrice(0);
          return;
      }

      const startDateTime = `${selectedDate}T${startTime}:00`;
      const endDateTime = `${selectedDate}T${endTime}:00`;
      
      const response = await api.post('/booking/check-availability', {
        courtId: parseInt(selectedCourtId), 
        startTime: startDateTime,
        endTime: endDateTime
      });

      if (response.data.available) {
        setEstimatedPrice(response.data.estimatedPrice);
      } else {
        setBookingError(response.data.conflictReason || 'Khung giờ này đã được đặt');
        setEstimatedPrice(0);
      }
    } catch (err) { 
      console.error('Error checking availability:', err.response?.data?.error || err.message || err);
      setBookingError(err.response?.data?.error || 'Không thể kiểm tra tình trạng sân');
      setEstimatedPrice(0);
    } finally {
      setCheckingPrice(false);
    }
  };

  const validateForm = () => {
    if (!customerName.trim()) { setBookingError('Vui lòng nhập tên khách hàng'); return false; }
    if (!customerPhone.trim()) { setBookingError('Vui lòng nhập số điện thoại khách hàng'); return false; }
    if (!selectedComplexData || !selectedComplexData.id) { setBookingError('Không tìm thấy thông tin khu phức hợp sân của bạn.'); return false; }
    if (!selectedCourtId || !selectedDate || !startTime || !endTime) { setBookingError('Vui lòng chọn đầy đủ thông tin đặt sân'); return false; }
    // Kiểm tra selectedComplexData.courts trước khi truy cập .length
    if (!selectedComplexData.courts || selectedComplexData.courts.length === 0) { 
        setBookingError('Khu phức hợp này chưa có sân nào được tạo. Vui lòng thêm sân.'); return false;
    }
    if (startTime >= endTime) { setBookingError('Thời gian kết thúc phải sau thời gian bắt đầu'); return false; }
    const selectedDateTime = new Date(`${selectedDate}T${startTime}`);
    const now = new Date();
    if (selectedDateTime <= now) { setBookingError('Không thể đặt sân trong quá khứ'); return false; }
    const startDateTime = new Date(`${selectedDate}T${startTime}`);
    const endDateTime = new Date(`${selectedDate}T${endTime}`);
    const durationMinutes = (endDateTime - startDateTime) / (1000 * 60);
    if (durationMinutes < 30) { setBookingError('Thời gian đặt sân tối thiểu là 30 phút'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true); 
    setBookingError('');

    try {
      const startDateTime = `${selectedDate}T${startTime}:00`;
      const endDateTime = `${selectedDate}T${endTime}:00`;

      const response = await api.post('/booking/walk-in', { 
        courtId: parseInt(selectedCourtId), 
        startTime: startDateTime,
        endTime: endDateTime,
        customerName: customerName.trim(), 
        customerPhone: customerPhone.trim() 
      });

      setSuccess('Đặt sân thành công cho khách vãng lai! Mã đơn: ' + response.data.bookingId);
      
      setCustomerName('');
      setCustomerPhone('');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      // Reset selectedCourtId về sân đầu tiên của complex hiện tại
      setSelectedCourtId(selectedComplexData.courts.length > 0 ? selectedComplexData.courts[0].id.toString() : ''); 
      setStartTime('');
      setEndTime('');
      setEstimatedPrice(0);
      setBookingError(''); 
      
    } catch (err) { 
      console.error('Error creating walk-in booking:', err.response?.data?.error || err.message || err);
      setBookingError(err.response?.data?.error || 'Có lỗi xảy ra khi đặt sân.');
    } finally {
      setSubmitting(false); 
    }
  };

  const formatPriceForDisplay = (price) => {
    if (typeof price !== 'number') price = parseFloat(price);
    if (isNaN(price)) price = 0;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const getSelectedCourtName = () => {
    if (!selectedComplexData || !selectedComplexData.courts || !selectedCourtId) return ''; 
    const court = selectedComplexData.courts.find(c => c.id === parseInt(selectedCourtId));
    return court ? court.name : '';
  };


  if (!user || user.role !== 'Owner') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-700" />
          <AlertDescription className="text-red-800">Bạn không có quyền truy cập trang này.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state cho toàn bộ trang (hiện spinner to)
  // Chỉ hiển thị loading nếu đang tải và selectedComplexData chưa được tải hoặc đang lỗi
  if (loading && !selectedComplexData && !error) { 
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-20 w-20 text-green-600 animate-spin" />
      </div>
    );
  }

  // Hiển thị thông báo lỗi nếu có lỗi tổng quát hoặc không tìm thấy complex
  if (error || !selectedComplexData) { 
      return (
        <div className="container mx-auto px-4 py-8">
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-700" />
            <AlertDescription className="text-red-800">{error || 'Không tìm thấy thông tin khu phức hợp sân của bạn để đặt.'}</AlertDescription>
            {/* Nút này hiển thị nếu không có complex nào hoặc complex có nhưng không có sân */}
            {(!selectedComplexData || (selectedComplexData.courts && selectedComplexData.courts.length === 0)) && (
                <Button onClick={() => navigate('/owner-setup')} className="mt-4">
                    {!selectedComplexData ? 'Tạo khu phức hợp' : 'Quản lý sân'}
                </Button>
            )}
          </Alert>
        </div>
      );
  }

  // Nếu complexDetail đã load nhưng không có sân nào trong đó
  if (selectedComplexData.courts && selectedComplexData.courts.length === 0) { // <<< selectedComplexData.courts là mảng rỗng
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-700" />
          <AlertDescription className="text-yellow-800">
            Khu phức hợp **"{selectedComplexData.name}"** của bạn chưa có sân nào được tạo. Vui lòng thêm sân để có thể đặt sân vãng lai.
          </AlertDescription>
          <Button onClick={() => navigate(`/owner/manage-courts/${selectedComplexData.id}`)} className="mt-4">
            Quản lý sân
          </Button>
        </Alert>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="outline" 
              onClick={() => navigate('/owner-dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
            <h1 className="text-2xl font-bold">Đặt sân cho khách vãng lai</h1>
          </div>
        </div>

        {/* Thông báo thành công */}
        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircleIcon className="h-4 w-4 text-green-700" /> 
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Thông tin khu phức hợp được chọn tự động */}
        <Card className="mb-6 shadow-md rounded-lg">
            <CardHeader>
                <CardTitle>Khu phức hợp: {selectedComplexData.name}</CardTitle> 
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-600">Địa chỉ: {selectedComplexData.address}, {selectedComplexData.city}</p>
                <p className="text-sm text-gray-600">Giờ hoạt động: {selectedComplexData.openTime} - {selectedComplexData.closeTime}</p>
            </CardContent>
        </Card>

        {/* Customer Information */}
        <Card className="mb-6 shadow-md rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Thông tin khách hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tên khách hàng *</label>
                <Input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nhập tên khách hàng"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Số điện thoại *</label>
                <Input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Nhập số điện thoại"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Information */}
        <Card className="mb-6 shadow-md rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Thông tin đặt sân
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Ngày</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Court Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Sân</label>
                <select
                  value={selectedCourtId} 
                  onChange={(e) => setSelectedCourtId(e.target.value)} 
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Chọn sân</option>
                  {(selectedComplexData.courts || []).map(court => ( 
                    <option key={court.id} value={court.id}>
                      {court.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium mb-2">Giờ bắt đầu</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  min={selectedComplexData.openTime} 
                  max={selectedComplexData.closeTime} 
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium mb-2">Giờ kết thúc</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min={startTime || selectedComplexData.openTime} 
                  max={selectedComplexData.closeTime} 
                />
              </div>
            </div>

            {/* Error Display (for booking-specific errors) */}
            {bookingError && (
              <Alert className="mb-4 bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{bookingError}</AlertDescription>
              </Alert>
            )}

            {/* Price Display */}
            {estimatedPrice > 0 && !bookingError && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-green-800 font-medium">Giá ước tính:</span>
                    <p className="text-sm text-green-600">
                      {getSelectedCourtName()} - {startTime} đến {endTime}
                    </p>
                  </div>
                  <span className="text-green-800 font-bold text-lg">
                    {formatPriceForDisplay(estimatedPrice)}
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || checkingPrice || estimatedPrice === 0 || !!bookingError} 
                size="lg"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting ? 'Đang xử lý...' : checkingPrice ? 'Đang kiểm tra...' : 'Đặt sân'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Availability Calendar */}
        {selectedComplexData && selectedComplexData.id && ( 
          <AvailabilityCalendar
            complexId={parseInt(selectedComplexData.id)}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onSlotSelect={(slotData) => {
                setSelectedCourtId(slotData.courtId);
                setStartTime(slotData.startTime);
                setEndTime(slotData.endTime);
            }}
            mode="owner"
          />
        )}
      </div>
    </div>
  );
}