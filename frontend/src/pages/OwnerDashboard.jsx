// frontend/src/pages/OwnerDashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, Eye, Phone, Mail} from 'lucide-react'; 
import api from '@/lib/api';
import {
  Building2,
  MapPin,
  Clock,
  Users,
  Calendar,
  DollarSign,
  Edit,
  Settings,
  BarChart3,
  TrendingUp,
  Star
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';


const OwnerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState(null);
  const [courtComplex, setCourtComplex] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [error, setError] = useState('');

  // States cho dialog hành động chung (Reject/Cancel)
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [currentActionBookingId, setCurrentActionBookingId] = useState(null);
  const [actionType, setActionType] = useState(null); // 'reject' or 'cancel'
  const [actionReason, setActionReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // States cho dialog Xem chi tiết
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);


  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const response = await api.get('/owner/setup-status');
      setSetupStatus(response.data);
      
      if (response.data.hasCourtComplex) {
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
      setError('Không thể kiểm tra trạng thái thiết lập');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [complexResponse, statsResponse, bookingsResponse] = await Promise.all([
        api.get('/owner/court-complexes'),
        api.get('/owner/statistics'),
        api.get('/owner/bookings?limit=5')
      ]);

      console.log('API Response for court-complexes:', complexResponse.data);
      console.log('API Response for statistics:', statsResponse.data); // DEBUG: Log stats response
      console.log('Extracted courtComplexes array:', complexResponse.data.courtComplexes);

      if (complexResponse.data.courtComplexes && complexResponse.data.courtComplexes.length > 0) {
        const firstComplex = complexResponse.data.courtComplexes[0];
        setCourtComplex(firstComplex);
        console.log('Set courtComplex state with:', firstComplex);
        console.log('ID being set:', firstComplex?.id);
      } else {
        setCourtComplex(null);
        if (setupStatus?.hasCourtComplex) {
            setError('Không tìm thấy thông tin khu phức hợp sân, mặc dù trạng thái cho thấy đã thiết lập.');
        }
      }
      
      setStatistics(statsResponse.data.overview); // Đảm bảo lấy đúng object overview
      setRecentBookings(bookingsResponse.data.bookings || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSetup = () => {
    navigate('/owner-setup');
  };

  const handleEditComplex = (complexIdToEdit) => {
    console.log('Attempting to navigate for Edit. Complex ID received:', complexIdToEdit);
    if (complexIdToEdit) {
      navigate(`/owner/edit-complex/${complexIdToEdit}`);
    } else {
      console.error('Navigation prevented: Complex ID is missing for editing.');
      setError('Không thể chỉnh sửa: ID khu phức hợp không hợp lệ. Vui lòng thử lại sau hoặc đảm bảo khu phức hợp đã được tạo.');
    }
  };

  const handleManageCourts = (complexIdToManage) => {
    console.log('Attempting to navigate for Manage Courts. Complex ID received:', complexIdToManage);
    if (complexIdToManage) {
      navigate(`/owner/manage-courts/${complexIdToManage}`);
    } else {
      console.error('Navigation prevented: Complex ID is missing for managing courts.');
      setError('Không thể quản lý sân: ID khu phức hợp không hợp lệ. Vui lòng thử lại sau hoặc đảm bảo khu phức hợp đã được tạo.');
    }
  };

  const handleApproveBooking = async (bookingId) => {
    try {
      await api.put(`/owner/bookings/${bookingId}/approve`, {});
      await fetchDashboardData();
      setError('');
      alert('Đơn đặt đã được duyệt thành công!');
    } catch (error) {
      console.error('Error approving booking:', error);
      setError(error.response?.data?.error || 'Không thể duyệt đơn đặt sân');
      alert(`Lỗi duyệt đơn: ${error.response?.data?.error || 'Unknown error'}`);
    }
  };

  const openActionDialog = (bookingId, type) => {
    setCurrentActionBookingId(bookingId);
    setActionType(type);
    setActionReason('');
    setIsActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!currentActionBookingId) return;

    setIsProcessingAction(true);
    setError('');

    try {
      if (actionType === 'reject') {
        await api.put(`/owner/bookings/${currentActionBookingId}/reject`, { reason: actionReason || '' });
        alert('Đơn đặt đã được từ chối thành công!');
      } else if (actionType === 'cancel') {
        await api.put(`/owner/bookings/${currentActionBookingId}/cancel`, { reason: actionReason || '' });
        alert('Đơn đặt đã được hủy thành công!');
      }
      
      await fetchDashboardData();
      setIsActionDialogOpen(false);
      setCurrentActionBookingId(null);
      setActionType(null);
      setActionReason('');
    } catch (error) {
      console.error(`Error ${actionType}ing booking:`, error);
      setError(error.response?.data?.error || `Có lỗi xảy ra khi ${actionType} đơn.`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCompleteBooking = async (bookingId) => {
    try {
      if (!window.confirm('Bạn có chắc chắn muốn đánh dấu đơn này là HOÀN THÀNH không?')) {
        return;
      }
      await api.put(`/owner/bookings/${bookingId}/complete`, {});
      await fetchDashboardData();
      setError('');
      alert('Đơn đặt đã được đánh dấu HOÀN THÀNH!');
    } catch (error) {
      console.error('Error completing booking:', error);
      setError(error.response?.data?.error || 'Không thể đánh dấu hoàn thành đơn đặt sân');
      alert(`Lỗi: ${error.response?.data?.error || 'Unknown error'}`);
    }
  };

  const openDetailDialog = (booking) => {
    setSelectedBookingDetails(booking);
    setIsDetailDialogOpen(true);
  };

  // Formatters (đảm bảo chúng có thể xử lý các giá trị null/undefined an toàn)
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-20 w-20 text-green-600 animate-spin" />
      </div>
    );
  }

  if (!setupStatus?.hasCourtComplex) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <Building2 className="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Chào mừng đến với SportSync Owner
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Để bắt đầu quản lý sân thể thao của bạn, vui lòng thiết lập thông tin khu phức hợp sân.
            </p>
          </div>

          <Card className="p-8">
            <CardHeader>
              <CardTitle className="text-xl">Thiết lập khu phức hợp sân</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Bạn cần thiết lập thông tin cơ bản về khu phức hợp sân, các sân con,
                và bảng giá để khách hàng có thể tìm kiếm và đặt sân.
              </p>
              <Button onClick={handleStartSetup} size="lg" className="w-full">
                <Building2 className="w-5 h-5 mr-2" />
                Bắt đầu thiết lập
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Quản lý</h1>
            <p className="text-gray-600">Quản lý khu phức hợp sân thể thao của bạn</p>
          </div>
          <Button
            onClick={() => navigate('/owner/walk-in-booking')}
            className="bg-green-600 hover:bg-green-700"
          >
            <Users className="w-4 h-4 mr-2" />
            Đặt sân cho khách vãng lai
          </Button>
        </div>
      </div>

      {/* Court Complex Info - CHỈ HIỂN THỊ KHI courtComplex ĐÃ CÓ DỮ LIỆU */}
      {courtComplex ? (
        <Card className="mb-8 p-6 shadow-lg rounded-lg"> {/* Thêm padding và shadow */}
          <CardHeader className="p-0 mb-4"> {/* Bỏ padding mặc định */}
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-2xl font-semibold text-gray-800"> {/* Font lớn hơn */}
                <Building2 className="w-6 h-6 mr-3 text-green-600" />
                {courtComplex.name}
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                    onClick={() => handleEditComplex(courtComplex.id)}
                    variant="outline"
                    size="sm"
                    disabled={!courtComplex.id}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Chỉnh sửa
                </Button>
                <Button
                    onClick={() => handleManageCourts(courtComplex.id)}
                    variant="outline"
                    size="sm"
                    disabled={!courtComplex.id}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Quản lý sân
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0"> {/* Bỏ padding mặc định */}
            {courtComplex.mainImage && (
              <div className="mb-6 w-full h-48 md:h-64 rounded-lg overflow-hidden relative"> {/* Ảnh nhỏ lại, có chiều cao cố định */}
                <img
                  src={courtComplex.mainImage}
                  alt={courtComplex.name}
                  className="w-full h-full object-cover"
                />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div> {/* Overlay */}
                 <div className="absolute bottom-4 left-4 text-white text-lg font-bold">
                    {courtComplex.name}
                 </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6 text-sm text-gray-700"> {/* Gap lớn hơn */}
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-gray-500">Địa chỉ</p>
                  <p className="font-medium">{courtComplex.address}, {courtComplex.city}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-gray-500">Giờ hoạt động</p>
                  <p className="font-medium">
                    {courtComplex.openTime} - {courtComplex.closeTime}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-gray-500">Loại thể thao</p>
                  <p className="font-medium">{courtComplex.sportType}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Star className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-gray-500">Đánh giá</p>
                  <p className="font-medium">
                    {courtComplex.rating ? `${courtComplex.rating.toFixed(1)}/5` : 'Chưa có'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
          <div className="text-center py-8">
              <p className="text-gray-500">Đang tải thông tin khu phức hợp...</p>
          </div>
      )}

      {/* Statistics */}
      {statistics ? ( 
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-md rounded-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tổng số sân</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totalCourts || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md rounded-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Booking tháng này</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.monthlyBookings || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md rounded-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Doanh thu tháng này</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.monthlyRevenue ? `${statistics.monthlyRevenue.toLocaleString()} VNĐ` : '0 VNĐ'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md rounded-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tỷ lệ lấp đầy</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.occupancyRate ? `${statistics.occupancyRate.toFixed(1)}%` : '0%'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-16 h-16 mx-auto mb-4" />
            <p>Đang tải thống kê hoặc chưa có dữ liệu thống kê.</p>
          </div>
      )}

      {/* Recent Bookings */}
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-xl font-semibold text-gray-800">
              <Calendar className="w-5 h-5 mr-2" />
              Đơn đặt sân gần đây
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/owner/bookings')}
            >
              Xem tất cả
            </Button>
          </div>
        </CardHeader>
<CardContent>
          {recentBookings.length > 0 ? (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{booking.customerName}</p>
                      <p className="text-sm text-gray-600">
                        {booking.courtName} - {new Date(booking.startTime).toLocaleDateString('vi-VN')} ({new Date(booking.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})} - {new Date(booking.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})})
                      </p>
                      {booking.customerEmail && (
                        <p className="text-sm text-gray-500 flex items-center"><Mail className="w-3 h-3 mr-1"/> {booking.customerEmail}</p>
                      )}
                      {booking.customerPhone && (
                        <p className="text-sm text-gray-500 flex items-center"><Phone className="w-3 h-3 mr-1"/> {booking.customerPhone}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{booking.totalPrice?.toLocaleString()} VNĐ</p>
                      <p className={`text-sm font-semibold ${
                        booking.status === 'Confirmed' ? 'text-green-600' :
                        booking.status === 'Pending' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {booking.status === 'Pending' ? 'Chờ duyệt' : 
                         booking.status === 'Confirmed' ? 'Đã duyệt' : 
                         booking.status === 'Rejected' ? 'Đã từ chối' : 
                         booking.status === 'Cancelled' ? 'Đã hủy' : 
                         booking.status === 'Completed' ? 'Hoàn thành' : booking.status}
                      </p>
                    </div>
                    
                    {/* LOGIC HIỂN THỊ NÚT ĐƠN GIẢN HƠN */}
                    <div className="flex flex-col space-y-1 ml-4 w-28">
                        {booking.status === 'Pending' && (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() => handleApproveBooking(booking.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    Duyệt
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openActionDialog(booking.id, 'reject')}
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                    Từ chối
                                </Button>
                            </>
                        )}

                        {booking.status === 'Confirmed' && (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() => handleCompleteBooking(booking.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <Check className="w-4 h-4 mr-1" /> Hoàn thành
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openActionDialog(booking.id, 'cancel')}
                                    className="border-red-500 text-red-600 hover:bg-red-50"
                                >
                                    Hủy đơn
                                </Button>
                            </>
                        )}

                        {(booking.status === 'Completed' || booking.status === 'Rejected' || booking.status === 'Cancelled') && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDetailDialog(booking)} 
                                className="border-gray-300 text-gray-600 hover:bg-gray-50"
                            >
                                <Eye className="w-4 h-4 mr-1" /> Xem chi tiết
                            </Button>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Chưa có đơn đặt sân nào</p>
            </div>
          )}
        </CardContent>
      </Card>
       {/* Reject Booking Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
                {actionType === 'reject' ? 'Từ chối đơn đặt sân' : 'Hủy đơn đặt sân'}
            </DialogTitle>
            <DialogDescription>
                {actionType === 'reject' ?
                    'Vui lòng nhập lý do từ chối để thông báo cho khách hàng (Tùy chọn).' :
                    'Vui lòng nhập lý do hủy đơn (Tùy chọn).'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder={actionType === 'reject' ?
                  "Lý do từ chối (ví dụ: sân đã kín, không đủ nhân viên, v.v.)" :
                  "Lý do hủy (ví dụ: khách hàng yêu cầu hủy, lỗi đặt trùng, v.v.)"}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)} disabled={isProcessingAction}>
              Hủy
            </Button>
            <Button onClick={confirmAction} disabled={isProcessingAction}>
              {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {actionType === 'reject' ? 'Xác nhận từ chối' : 'Xác nhận hủy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 {/* Booking Details Dialog (MỚI) */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg"> {/* Kích thước lớn hơn cho chi tiết */}
          <DialogHeader>
            <DialogTitle>Chi tiết đơn đặt sân #{selectedBookingDetails?.id}</DialogTitle>
            <DialogDescription>Thông tin chi tiết về đơn đặt sân của khách hàng.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {selectedBookingDetails && (
              <>
                <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                        <p className="text-sm text-gray-500">Ngày</p>
                        <p className="font-medium">{formatDate(selectedBookingDetails.startTime)}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                        <p className="text-sm text-gray-500">Thời gian</p>
                        <p className="font-medium">{formatTime(selectedBookingDetails.startTime)} - {formatTime(selectedBookingDetails.endTime)}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-gray-500" />
                    <div>
                        <p className="text-sm text-gray-500">Sân</p>
                        <p className="font-medium">{selectedBookingDetails.courtName} tại {selectedBookingDetails.complexName}</p>
                        <p className="text-sm text-gray-600">{selectedBookingDetails.complexAddress}, {selectedBookingDetails.complexCity}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-gray-500" />
                    <div>
                        <p className="text-sm text-gray-500">Khách hàng</p>
                        <p className="font-medium">{selectedBookingDetails.customerName}</p>
                        {selectedBookingDetails.customerEmail && (
                            <p className="text-sm text-gray-600 flex items-center"><Mail className="w-4 h-4 mr-1"/>{selectedBookingDetails.customerEmail}</p>
                        )}
                        {selectedBookingDetails.customerPhone && (
                            <p className="text-sm text-gray-600 flex items-center"><Phone className="w-4 h-4 mr-1"/>{selectedBookingDetails.customerPhone}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-gray-500" />
                    <div>
                        <p className="text-sm text-gray-500">Tổng tiền</p>
                        <p className="font-bold text-lg text-blue-600">{formatPrice(selectedBookingDetails.totalPrice)}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Check className="w-5 h-5 text-gray-500" />
                    <div>
                        <p className="text-sm text-gray-500">Trạng thái</p>
                        <Badge className={`text-sm ${
                            selectedBookingDetails.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                            selectedBookingDetails.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                            {selectedBookingDetails.status === 'Pending' ? 'Chờ duyệt' :
                            selectedBookingDetails.status === 'Confirmed' ? 'Đã duyệt' :
                            selectedBookingDetails.status === 'Rejected' ? 'Đã từ chối' :
                            selectedBookingDetails.status === 'Cancelled' ? 'Đã hủy' :
                            selectedBookingDetails.status === 'Completed' ? 'Hoàn thành' : selectedBookingDetails.status}
                        </Badge>
                    </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDetailDialogOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnerDashboard;