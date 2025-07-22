// frontend/src/pages/MyBookings.jsx

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, MapPin, Clock, DollarSign, Eye, ChevronLeft, ChevronRight,Check, Search, SlidersHorizontal, Users, Building2, Mail, Phone } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea'; // Vẫn giữ nếu bạn dùng trong dialog chi tiết hoặc khác
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

// --- Hàm định dạng ---
const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};
const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};
const formatPrice = (price) => {
    if (typeof price !== 'number') price = parseFloat(price);
    if (isNaN(price)) price = 0;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(price);
};
// -----------------------------------------------------


const MyBookings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // States cho các option trong dropdown lọc và sắp xếp
  const [statuses] = useState([
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'Pending', label: 'Chờ thanh toán' },
    { value: 'Confirmed', label: 'Đã xác nhận' },
    { value: 'Completed', label: 'Hoàn thành' },
    { value: 'Rejected', label: 'Đã từ chối' },
    { value: 'Cancelled', label: 'Đã hủy' },
  ]);
  const [sortByOptions] = useState([
    { value: 'createdAt', label: 'Ngày tạo' },
    { value: 'startTime', label: 'Giờ bắt đầu' },
    { value: 'totalPrice', label: 'Tổng tiền' },
    { value: 'status', label: 'Trạng thái' },
    { value: 'courtName', label: 'Tên sân' },
    { value: 'complexName', label: 'Tên khu phức hợp' },
  ]);

  // States cho dialog Xem chi tiết (giữ nguyên)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);


  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage,
        limit: 10,
        ...filters,
      };
      
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === undefined || params[key] === null) {
          delete params[key];
        }
      });

      const response = await api.get('/booking/my-bookings', { params });
      setBookings(response.data.bookings);
      setTotalItems(response.data.totalItems);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage);
    } catch (err) {
      console.error('Error fetching bookings:', err.response?.data?.error || err.message || err);
      setError('Không thể tải danh sách đơn đặt sân của bạn.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);


  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Hàm mở dialog Xem chi tiết (giữ nguyên)
  const openDetailDialog = (booking) => {
    setSelectedBookingDetails(booking);
    setIsDetailDialogOpen(true);
  };


  if (loading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-20 w-20 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Lịch sử đặt sân của tôi</h1>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Filter and Sort Section */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium mb-1">Tìm kiếm</label>
              <Input
                id="search"
                name="search"
                placeholder="Tên sân, khu phức hợp..."
                value={filters.search}
                onChange={handleFilterChange}
                className="w-full"
              />
            </div>
            
            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium mb-1">Trạng thái</label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {statuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium mb-1">Ngày</label>
              <Input
                id="date"
                name="date"
                type="date"
                value={filters.date}
                onChange={handleFilterChange}
                className="w-full"
              />
            </div>

            {/* Sort By */}
            <div>
              <label htmlFor="sortBy" className="block text-sm font-medium mb-1">Sắp xếp theo</label>
              <select
                id="sortBy"
                name="sortBy"
                value={filters.sortBy}
                onChange={handleSortChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {sortByOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label htmlFor="sortOrder" className="block text-sm font-medium mb-1">Thứ tự</label>
              <select
                id="sortOrder"
                name="sortOrder"
                value={filters.sortOrder}
                onChange={handleSortChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="desc">Mới nhất</option>
                <option value="asc">Cũ nhất</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách đơn đặt sân của bạn ({totalItems} đơn)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && bookings.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
              <span className="ml-2">Đang tải đơn đặt sân...</span>
            </div>
          ) : bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg shadow-sm">
                  <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4 mb-4 md:mb-0">
                    {/* Booking Basic Info */}
                    <div>
                      <p className="text-gray-500 text-xs">Mã đơn</p>
                      <p className="font-semibold text-blue-600">#{booking.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Sân & Khu phức hợp</p>
                      <p className="font-semibold">{booking.courtName}</p>
                      <p className="text-sm text-gray-600">{booking.complexName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Thời gian</p>
                      <p className="font-semibold">{formatDate(booking.startTime)}</p>
                      <p className="text-sm text-gray-600">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</p>
                    </div>
                    {/* Customer Info (Not shown here for customer's own page) */}
                    {/* Price & Status */}
                    <div>
                      <p className="text-gray-500 text-xs">Tổng tiền</p>
                      <p className="font-bold text-lg text-blue-600">{formatPrice(booking.totalPrice)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Trạng thái</p>
                      <Badge className={`text-sm ${
                        booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.status === 'Pending' ? 'Chờ thanh toán' :
                         booking.status === 'Confirmed' ? 'Đã xác nhận' :
                         booking.status === 'Rejected' ? 'Đã từ chối' :
                         booking.status === 'Cancelled' ? 'Đã hủy' :
                         booking.status === 'Completed' ? 'Hoàn thành' : booking.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Action Buttons for Customer */}
                  <div className="flex flex-col space-y-2 ml-0 md:ml-4 mt-4 md:mt-0 w-full md:w-auto">
                    {/* Nút Thanh toán (chỉ khi Pending) */}
                    {booking.status === 'Pending' && (
                        <Button
                            size="sm"
                            onClick={() => navigate(`/payment/${booking.id}`)}
                            className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                        >
                            Thanh toán
                        </Button>
                    )}

                    {/* Nút Xem chi tiết (cho tất cả các trạng thái) */}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDetailDialog(booking)}
                        className="border-gray-300 text-gray-600 hover:bg-gray-50 w-full"
                    >
                        <Eye className="w-4 h-4 mr-1" /> Xem chi tiết
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Bạn chưa có đơn đặt sân nào phù hợp.</p>
            </div>
          )}
        </CardContent>
        {/* Pagination */}
        {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium">Trang {currentPage} / {totalPages}</span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        )}
      </Card>

      {/* Booking Details Dialog (Giữ nguyên) */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn đặt sân #{selectedBookingDetails?.id}</DialogTitle>
            <DialogDescription>Thông tin chi tiết về đơn đặt sân của bạn.</DialogDescription>
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
                {/* Thông tin khách hàng không hiển thị ở đây vì là đơn của chính họ */}
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
                            {selectedBookingDetails.status === 'Pending' ? 'Chờ thanh toán' :
                            selectedBookingDetails.status === 'Confirmed' ? 'Đã xác nhận' :
                            selectedBookingDetails.status === 'Rejected' ? 'Đã từ chối' :
                            selectedBookingDetails.status === 'Cancelled' ? 'Đã hủy' :
                            selectedBookingDetails.status === 'Completed' ? 'Hoàn thành' : selectedBookingDetails.status}
                        </Badge>
                    </div>
                </div>
                {/* Có thể thêm lý do hủy/từ chối nếu backend trả về */}
                {selectedBookingDetails.status === 'Rejected' && selectedBookingDetails.cancellationReason && (
                    <div className="flex items-start space-x-2">
                        <AlertDescription><strong className="text-red-700">Lý do từ chối:</strong> {selectedBookingDetails.cancellationReason}</AlertDescription>
                    </div>
                )}
                {selectedBookingDetails.status === 'Cancelled' && selectedBookingDetails.cancellationReason && (
                    <div className="flex items-start space-x-2">
                        <AlertDescription><strong className="text-red-700">Lý do hủy:</strong> {selectedBookingDetails.cancellationReason}</AlertDescription>
                    </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            {/* Nút thanh toán nhanh nếu là Pending */}
            {selectedBookingDetails?.status === 'Pending' && (
                <Button 
                    onClick={() => {
                        setIsDetailDialogOpen(false); // Đóng modal chi tiết
                        navigate(`/payment/${selectedBookingDetails.id}`); // Điều hướng đến trang thanh toán
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    Thanh toán ngay
                </Button>
            )}
            <Button onClick={() => setIsViewDetailsDialogOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBookings;  