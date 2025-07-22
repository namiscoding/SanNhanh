import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp,
  Plus,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react';
import api from '@/lib/api';

const OwnerDashboard = () => {
  const [statistics, setStatistics] = useState(null);
  const [complexes, setComplexes] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const statsResponse = await api.get('/owner/statistics');
      setStatistics(statsResponse.data);
      
      // Fetch court complexes
      const complexesResponse = await api.get('/owner/court-complexes');
      setComplexes(complexesResponse.data.courtComplexes);
      
      // Fetch recent bookings
      const bookingsResponse = await api.get('/owner/bookings?limit=5');
      setRecentBookings(bookingsResponse.data.bookings);
      
    } catch (error) {
      setError(error.response?.data?.error || 'Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async (bookingId) => {
    try {
      await api.put(`/owner/bookings/${bookingId}/confirm`);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      setError(error.response?.data?.error || 'Không thể xác nhận booking');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { variant: 'secondary', label: 'Chờ xử lý' },
      'Confirmed': { variant: 'default', label: 'Đã xác nhận' },
      'Cancelled': { variant: 'destructive', label: 'Đã hủy' },
      'Completed': { variant: 'outline', label: 'Hoàn thành' },
      'Active': { variant: 'default', label: 'Hoạt động' },
      'Inactive': { variant: 'secondary', label: 'Tạm dừng' }
    };
    
    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Chủ Sân</h1>
            <p className="text-gray-600">Quản lý khu phức hợp sân và theo dõi hoạt động kinh doanh</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Khu Phức Hợp</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.overview.totalComplexes}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Sân</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.overview.totalCourts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Booking</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.overview.totalBookings}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Doanh Thu</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(statistics.overview.totalRevenue)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Court Complexes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Khu Phức Hợp Sân
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complexes.slice(0, 5).map((complex) => (
                  <div key={complex.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold">{complex.name}</h3>
                      <p className="text-sm text-gray-600">{complex.address}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span>{complex.courtCount} sân</span>
                        <span>{complex.monthlyBookings} booking/tháng</span>
                        <span>{formatCurrency(complex.monthlyRevenue)}/tháng</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(complex.status)}
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {complexes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Chưa có khu phức hợp sân nào</p>
                    <Button className="mt-4">Tạo khu phức hợp đầu tiên</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Booking Gần Đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold">{booking.court?.name}</h3>
                      <p className="text-sm text-gray-600">{booking.customer?.fullName}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span>{new Date(booking.startTime).toLocaleDateString('vi-VN')}</span>
                        <span>{formatCurrency(booking.totalPrice)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(booking.status)}
                      {booking.status === 'Pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleConfirmBooking(booking.id)}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Xác nhận
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {recentBookings.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Chưa có booking nào</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Revenue Chart */}
        {statistics?.monthlyStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Doanh Thu 12 Tháng Gần Đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-end justify-between gap-2">
                {statistics.monthlyStats.map((stat, index) => {
                  const maxRevenue = Math.max(...statistics.monthlyStats.map(s => s.revenue));
                  const height = maxRevenue > 0 ? (stat.revenue / maxRevenue) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                        title={`${stat.month}: ${formatCurrency(stat.revenue)}`}
                      ></div>
                      <div className="text-xs mt-2 text-gray-600 transform -rotate-45 origin-left">
                        {stat.month}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;

