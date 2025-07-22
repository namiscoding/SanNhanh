// frontend/src/pages/CourtComplexDetail.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import { 
  MapPin, Phone, Clock, Star, Users, Wifi, Car, 
  Coffee, ArrowLeft, Calendar, DollarSign, AlertCircle,
  ShowerHead, X, ChevronLeft, ChevronRight // <<< THÊM X, ChevronLeft, ChevronRight cho lightbox
} from 'lucide-react';
import api from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

// Thêm các component cho Dialog nếu chưa có (từ shadcn/ui)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';


export default function CourtComplexDetail() {
  const { complexId } = useParams(); 
  const navigate = useNavigate();
  const user = getStoredUser();
  
  const [loading, setLoading] = useState(true);
  const [complex, setComplex] = useState(null);
  const [error, setError] = useState('');
  
  // Booking states
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date(); // Lấy ngày hiện tại theo múi giờ local
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedCourt, setSelectedCourt] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [bookingError, setBookingError] = useState('');
  const [checkingPrice, setCheckingPrice] = useState(false);

  // States cho Lightbox ảnh
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchComplexDetail();
  }, [complexId]);

  useEffect(() => {
    if (selectedCourt && startTime && endTime && selectedDate) {
      checkAvailabilityAndPrice();
    } else {
      setEstimatedPrice(0);
    }
  }, [selectedCourt, startTime, endTime, selectedDate]);

  const fetchComplexDetail = async () => {
    try {
      setLoading(true);
      setError(''); 
      const response = await api.get(`/public/court-complexes/${complexId}`);
      
      const fetchedComplex = response.data;

      fetchedComplex.courts = fetchedComplex.courts || [];
      fetchedComplex.amenities = fetchedComplex.amenities || []; // Amenities bây giờ là objects {id, name, icon}
      fetchedComplex.reviews = fetchedComplex.reviews || [];
      fetchedComplex.images = fetchedComplex.images || []; // Đảm bảo images là mảng

      if (fetchedComplex.openTime && typeof fetchedComplex.openTime !== 'string') {
          fetchedComplex.openTime = fetchedComplex.openTime.substring(0, 5); 
      }
      if (fetchedComplex.closeTime && typeof fetchedComplex.closeTime !== 'string') {
          fetchedComplex.closeTime = fetchedComplex.closeTime.substring(0, 5); 
      }

      setComplex(fetchedComplex);
      
      if (fetchedComplex.courts.length > 0) {
        setSelectedCourt(fetchedComplex.courts[0].id);
      } else {
          setSelectedCourt('');
      }
    } catch (error) {
      console.error('Error fetching complex detail:', error.response?.data?.error || error.message || error);
      setError(error.response?.data?.error || 'Không thể tải thông tin khu phức hợp sân.');
      if (error.response?.status === 404) {
          setError('Khu phức hợp sân không tồn tại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkAvailabilityAndPrice = async () => {
    try {
      setCheckingPrice(true);
      setBookingError('');
      
      if (!selectedCourt || !startTime || !endTime || !selectedDate) {
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
        courtId: parseInt(selectedCourt),
        startTime: startDateTime,
        endTime: endDateTime
      });

      if (response.data.available) {
        setEstimatedPrice(response.data.estimatedPrice);
      } else {
        setBookingError(response.data.conflictReason || 'Khung giờ này đã được đặt');
        setEstimatedPrice(0);
      }
    } catch (error) {
      console.error('Error checking availability:', error.response?.data?.error || error.message || error);
      setBookingError(error.response?.data?.error || 'Không thể kiểm tra tình trạng sân');
      setEstimatedPrice(0);
    } finally {
      setCheckingPrice(false);
    }
  };

  const validateTimeSelection = () => {
    if (!selectedDate || !selectedCourt || !startTime || !endTime) {
      setBookingError('Vui lòng chọn đầy đủ thông tin');
      return false;
    }

    if (startTime >= endTime) {
      setBookingError('Thời gian kết thúc phải sau thời gian bắt đầu');
      return false;
    }

    const selectedDateTime = new Date(`${selectedDate}T${startTime}`);
    const now = new Date();
    
    if (selectedDateTime <= now) {
      setBookingError('Không thể đặt sân trong quá khứ');
      return false;
    }

    const startDateTime = new Date(`${selectedDate}T${startTime}`);
    const endDateTime = new Date(`${selectedDate}T${endTime}`);
    const durationMinutes = (endDateTime - startDateTime) / (1000 * 60);
    
    if (durationMinutes < 30) {
      setBookingError('Thời gian đặt sân tối thiểu là 30 phút');
      return false;
    }

    return true;
  };

  const handleBooking = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!validateTimeSelection()) return;

    try {
      setLoading(true);
      setBookingError('');

      const startDateTime = `${selectedDate}T${startTime}:00`;
      const endDateTime = `${selectedDate}T${endTime}:00`;

      const response = await api.post('/booking/create', {
        courtId: parseInt(selectedCourt),
        startTime: startDateTime,
        endTime: endDateTime
      });

      navigate(`/payment/${response.data.booking.id}`);
    } catch (error) {
      console.error('Error creating booking:', error.response?.data?.error || error.message || error);
      setBookingError(error.response?.data?.error || 'Có lỗi xảy ra khi đặt sân.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (typeof price !== 'number') price = parseFloat(price);
    if (isNaN(price)) price = 0;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getSelectedCourtName = () => {
    if (!complex || !complex.courts || !selectedCourt) return '';
    const court = complex.courts.find(c => c.id === parseInt(selectedCourt));
    return court ? court.name : '';
  };

  // --- Hàm xử lý Lightbox ---
  const openLightbox = (index) => {
    setCurrentImageIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % complex.images.length);
  };

  const goToPrevImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + complex.images.length) % complex.images.length);
  };
  // -------------------------


  if (loading && !complex) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (!complex) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Không tìm thấy thông tin khu phức hợp sân.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        {/* Complex Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Complex Info */}
              <div>
                <h1 className="text-3xl font-bold mb-4">{complex.name}</h1>
                
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-3" />
                    <span>{complex.address}, {complex.city}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-5 h-5 mr-3" />
                    <span>{complex.phoneNumber}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-5 h-5 mr-3" />
                    <span>Giờ mở cửa: {complex.openTime} - {complex.closeTime}</span>
                  </div>
                  
                  {complex.rating && (
                    <div className="flex items-center">
                      <Star className="w-5 h-5 text-yellow-400 mr-2" />
                      <span className="font-medium">{complex.rating.toFixed(1)}</span>
                      <span className="text-gray-500 ml-1">({complex.reviewCount || 0} đánh giá)</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {complex.description && (
                  <div className="mt-4">
                    <p className="text-gray-700">{complex.description}</p>
                  </div>
                )}

                {/* Amenities */}
                {complex.amenities && complex.amenities.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Tiện ích:</h3>
                    <div className="flex flex-wrap gap-2">
                      {complex.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm">
                          {amenity.icon === 'wifi' && <Wifi className="w-4 h-4 mr-1" />}
                          {amenity.icon === 'car' && <Car className="w-4 h-4 mr-1" />}
                          {amenity.icon === 'coffee' && <Coffee className="w-4 h-4 mr-1" />}
                          {amenity.icon === 'shower' && <ShowerHead className="w-4 h-4 mr-1" />}
                          <span>{amenity.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Complex Images (Main Image + Thumbnails) */}
              <div className="space-y-3">
                {complex.mainImage && (
                  <div 
                    className="w-full aspect-video rounded-lg overflow-hidden cursor-pointer shadow-md"
                    onClick={() => openLightbox(complex.images.findIndex(img => img === complex.mainImage) || 0)}
                  >
                    <img 
                      src={complex.mainImage} 
                      alt={complex.name}
                      className="w-full h-full object-cover" 
                    />
                  </div>
                )}
                
                {/* Thumbnails (nếu có nhiều ảnh) */}
                {complex.images && complex.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {complex.images.map((image, index) => (
                      <div 
                        key={index} 
                        className={`aspect-video rounded-md overflow-hidden cursor-pointer border-2 ${
                            index === (complex.images.findIndex(img => img === complex.mainImage) || 0) ? 'border-blue-500' : 'border-transparent'
                        } hover:border-blue-500 transition-colors`}
                        onClick={() => openLightbox(index)}
                      >
                        <img 
                          src={image} 
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Đặt sân
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
                  value={selectedCourt}
                  onChange={(e) => setSelectedCourt(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Chọn sân</option>
                  {complex.courts.map(court => (
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
                  min={complex.openTime}
                  max={complex.closeTime}
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium mb-2">Giờ kết thúc</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min={startTime || complex.openTime}
                  max={complex.closeTime}
                />
              </div>
            </div>

            {/* Error Display */}
            {bookingError && (
              <Alert className="mb-4">
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
                    {formatPrice(estimatedPrice)}
                  </span>
                </div>
              </div>
            )}

            {/* Booking Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleBooking} 
                disabled={loading || checkingPrice || estimatedPrice === 0 || !!bookingError}
                size="lg"
              >
                {loading ? 'Đang xử lý...' : checkingPrice ? 'Đang kiểm tra...' : 'Đặt sân ngay'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Availability Calendar */}
        {complexId && (
            <AvailabilityCalendar
                complexId={parseInt(complexId)}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onSlotSelect={(slotData) => {
                    setSelectedCourt(slotData.courtId);
                    setStartTime(slotData.startTime);
                    setEndTime(slotData.endTime);
                }}
                mode="customer"
            />
        )}


        {/* Reviews */}
        {complex.reviews && complex.reviews.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Đánh giá từ khách hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complex.reviews.map((review, index) => (
                  <div key={review.id || index} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-center mb-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="ml-2 font-medium">{review.customerName}</span>
                      <span className="ml-2 text-sm text-gray-500">{new Date(review.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-700">{review.comment}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}