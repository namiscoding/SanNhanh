// frontend/src/pages/AdminDashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, Building2, Calendar, DollarSign, BarChart3, TrendingUp, CheckCircle, XCircle } from 'lucide-react'; 
import api from '@/lib/api';

// RECHARTS IMPORTS
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Hàm định dạng tiền tệ (tái sử dụng)
const formatPrice = (price) => {
    if (typeof price !== 'number') price = parseFloat(price);
    if (isNaN(price)) price = 0;
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(price);
};

// Hàm định dạng ngày cho tooltip/axis (nếu cần)
const formatChartDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' });
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminStatistics();
  }, []);

  const fetchAdminStatistics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/statistics');
      setStatistics(response.data);
      console.log("Admin Statistics:", response.data);
    } catch (err) {
      console.error('Error fetching admin statistics:', err.response?.data?.error || err.message || err);
      setError(err.response?.data?.error || 'Không thể tải dữ liệu thống kê.');
      if (err.response?.status === 403) {
          setError('Bạn không có quyền truy cập trang quản trị.');
          setTimeout(() => navigate('/login'), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-20 w-20 text-green-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
        {error.includes("quyền truy cập") && (
            <div className="text-center mt-4">
                <Button onClick={() => navigate('/login')}>Đăng nhập lại</Button>
            </div>
        )}
      </div>
    );
  }

  if (!statistics) { 
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertDescription className="text-yellow-800">Không có dữ liệu thống kê để hiển thị.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard Quản trị</h1>
      <p className="text-gray-600 mb-8">Tổng quan các thông số quan trọng của hệ thống.</p>

      {/* Overview Statistics */}
      {/* Cần thêm một card mới cho AOV. Sẽ sắp xếp lại grid để có 5 card nếu cần */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8"> {/* Đổi thành lg:grid-cols-5 */}
        <Card className="shadow-md rounded-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Tổng người dùng</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.overview.totalUsers || 0}</p>
                <p className="text-xs text-gray-600">({statistics.overview.totalCustomers} Khách | {statistics.overview.totalOwners} Chủ sân)</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Khu phức hợp hoạt động</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.overview.totalActiveComplexes || 0}</p>
                <p className="text-xs text-gray-600">({statistics.overview.totalCourts} sân)</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Tổng số booking</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.overview.totalBookings || 0}</p>
                <p className="text-xs text-gray-600">({formatPrice(statistics.overview.totalPlatformRevenue)} tổng doanh thu)</p>
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
                <p className="text-2xl font-bold text-gray-900">{formatPrice(statistics.monthlyPlatformStats.revenue || 0)}</p>
                <p className="text-xs text-gray-600">({statistics.monthlyPlatformStats.bookings || 0} booking)</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NEW CARD: Average Order Value (AOV) */}
        <Card className="shadow-md rounded-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Giá trị đơn trung bình (AOV)</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(statistics.overview.averageOrderValue || 0)}</p>
                <p className="text-xs text-gray-600">trên mỗi đơn đã hoàn thành</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" /> {/* Dùng TrendingUp hoặc icon khác */}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Bookings Trend Chart */}
      <Card className="mb-8 shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">Xu hướng đặt sân 7 ngày qua</CardTitle>
        </CardHeader>
        <CardContent>
          {statistics.dailyBookingsTrend && statistics.dailyBookingsTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={statistics.dailyBookingsTrend}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatChartDate} 
                  angle={-45} 
                  textAnchor="end" 
                  height={60} 
                  interval={0}
                />
                <YAxis allowDecimals={false} />
                <Tooltip 
                  formatter={(value) => `${value} đơn`}
                  labelFormatter={(label) => `Ngày ${formatChartDate(label)}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  name="Số đơn đặt" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4" />
              <p>Không có dữ liệu xu hướng đặt sân trong 7 ngày qua.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Access / Management Links (Chỉ quản lý người dùng) */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-md rounded-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">Quản lý người dùng</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Xem và quản lý tài khoản người dùng, chủ sân, và admin.</p>
            <Button variant="outline" asChild>
              <Link to="/admin-users" className="w-full">
                <div className="flex items-center justify-center">
                  <Users className="w-4 h-4 mr-2" /> <span>Quản lý người dùng</span>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default AdminDashboard;