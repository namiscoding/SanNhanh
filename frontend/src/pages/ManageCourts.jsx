import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Clock, DollarSign } from 'lucide-react';
import api from '@/lib/api';

export default function ManageCourts() {
  const { complexId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [courts, setCourts] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCourt, setEditingCourt] = useState(null);
  const [courtForm, setCourtForm] = useState({
    name: '',
    status: 'Active',
    pricing: [
      { dayOfWeek: 'Monday', startTime: '06:00', endTime: '22:00', price: 100000 },
      { dayOfWeek: 'Tuesday', startTime: '06:00', endTime: '22:00', price: 100000 },
      { dayOfWeek: 'Wednesday', startTime: '06:00', endTime: '22:00', price: 100000 },
      { dayOfWeek: 'Thursday', startTime: '06:00', endTime: '22:00', price: 100000 },
      { dayOfWeek: 'Friday', startTime: '06:00', endTime: '22:00', price: 100000 },
      { dayOfWeek: 'Saturday', startTime: '06:00', endTime: '22:00', price: 150000 },
      { dayOfWeek: 'Sunday', startTime: '06:00', endTime: '22:00', price: 150000 }
    ]
  });

  useEffect(() => {
    fetchCourts();
  }, [complexId]);

  const fetchCourts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/owner/court-complexes/${complexId}/courts`);
      setCourts(response.data.courts);
    } catch (error) {
      console.error('Error fetching courts:', error);
      setError('Không thể tải danh sách sân. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourt = async (e) => {
    e.preventDefault();
    
    if (!courtForm.name.trim()) {
      setError('Vui lòng nhập tên sân.');
      return;
    }

    try {
      setError('');
      await api.post(`/owner/court-complexes/${complexId}/courts`, courtForm);
      
      setSuccess('Thêm sân thành công!');
      setShowAddForm(false);
      setCourtForm({
        name: '',
        status: 'Active',
        pricing: [
          { dayOfWeek: 'Monday', startTime: '06:00', endTime: '22:00', price: 100000 },
          { dayOfWeek: 'Tuesday', startTime: '06:00', endTime: '22:00', price: 100000 },
          { dayOfWeek: 'Wednesday', startTime: '06:00', endTime: '22:00', price: 100000 },
          { dayOfWeek: 'Thursday', startTime: '06:00', endTime: '22:00', price: 100000 },
          { dayOfWeek: 'Friday', startTime: '06:00', endTime: '22:00', price: 100000 },
          { dayOfWeek: 'Saturday', startTime: '06:00', endTime: '22:00', price: 150000 },
          { dayOfWeek: 'Sunday', startTime: '06:00', endTime: '22:00', price: 150000 }
        ]
      });
      
      fetchCourts();
      
    } catch (error) {
      console.error('Error adding court:', error);
      setError(error.response?.data?.error || 'Có lỗi xảy ra khi thêm sân.');
    }
  };

  const handleEditCourt = async (e) => {
    e.preventDefault();
    
    if (!courtForm.name.trim()) {
      setError('Vui lòng nhập tên sân.');
      return;
    }

    try {
      setError('');
      await api.put(`/owner/courts/${editingCourt.id}`, courtForm);
      
      setSuccess('Cập nhật sân thành công!');
      setEditingCourt(null);
      setCourtForm({
        name: '',
        status: 'Active',
        pricing: [
          { dayOfWeek: 'Monday', startTime: '06:00', endTime: '22:00', price: 100000 },
          { dayOfWeek: 'Tuesday', startTime: '06:00', endTime: '22:00', price: 100000 },
          { dayOfWeek: 'Wednesday', startTime: '06:00', endTime: '22:00', price: 100000 },
          { dayOfWeek: 'Thursday', startTime: '06:00', endTime: '22:00', price: 100000 },
          { dayOfWeek: 'Friday', startTime: '06:00', endTime: '22:00', price: 100000 },
          { dayOfWeek: 'Saturday', startTime: '06:00', endTime: '22:00', price: 150000 },
          { dayOfWeek: 'Sunday', startTime: '06:00', endTime: '22:00', price: 150000 }
        ]
      });
      
      fetchCourts();
      
    } catch (error) {
      console.error('Error updating court:', error);
      setError(error.response?.data?.error || 'Có lỗi xảy ra khi cập nhật sân.');
    }
  };

  const handleDeleteCourt = async (courtId) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sân này?')) {
      return;
    }

    try {
      await api.delete(`/owner/courts/${courtId}`);
      setSuccess('Xóa sân thành công!');
      fetchCourts();
    } catch (error) {
      console.error('Error deleting court:', error);
      setError(error.response?.data?.error || 'Có lỗi xảy ra khi xóa sân.');
    }
  };

  const startEdit = (court) => {
    setEditingCourt(court);
    setCourtForm({
      name: court.name,
      status: court.status,
      pricing: court.pricing.length > 0 ? court.pricing : [
        { dayOfWeek: 'Monday', startTime: '06:00', endTime: '22:00', price: 100000 },
        { dayOfWeek: 'Tuesday', startTime: '06:00', endTime: '22:00', price: 100000 },
        { dayOfWeek: 'Wednesday', startTime: '06:00', endTime: '22:00', price: 100000 },
        { dayOfWeek: 'Thursday', startTime: '06:00', endTime: '22:00', price: 100000 },
        { dayOfWeek: 'Friday', startTime: '06:00', endTime: '22:00', price: 100000 },
        { dayOfWeek: 'Saturday', startTime: '06:00', endTime: '22:00', price: 150000 },
        { dayOfWeek: 'Sunday', startTime: '06:00', endTime: '22:00', price: 150000 }
      ]
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingCourt(null);
    setShowAddForm(false);
    setCourtForm({
      name: '',
      status: 'Active',
      pricing: [
        { dayOfWeek: 'Monday', startTime: '06:00', endTime: '22:00', price: 100000 },
        { dayOfWeek: 'Tuesday', startTime: '06:00', endTime: '22:00', price: 100000 },
        { dayOfWeek: 'Wednesday', startTime: '06:00', endTime: '22:00', price: 100000 },
        { dayOfWeek: 'Thursday', startTime: '06:00', endTime: '22:00', price: 100000 },
        { dayOfWeek: 'Friday', startTime: '06:00', endTime: '22:00', price: 100000 },
        { dayOfWeek: 'Saturday', startTime: '06:00', endTime: '22:00', price: 150000 },
        { dayOfWeek: 'Sunday', startTime: '06:00', endTime: '22:00', price: 150000 }
      ]
    });
  };

  const updatePricing = (index, field, value) => {
    setCourtForm(prev => ({
      ...prev,
      pricing: prev.pricing.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const getDayName = (dayOfWeek) => {
    const days = {
      'Monday': 'Thứ 2',
      'Tuesday': 'Thứ 3',
      'Wednesday': 'Thứ 4',
      'Thursday': 'Thứ 5',
      'Friday': 'Thứ 6',
      'Saturday': 'Thứ 7',
      'Sunday': 'Chủ nhật'
    };
    return days[dayOfWeek] || dayOfWeek;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải danh sách sân...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý sân</h1>
            <p className="text-gray-600">Quản lý các sân trong khu phức hợp của bạn</p>
          </div>
          <div className="flex space-x-4">
            <Button
              onClick={() => navigate('/owner-dashboard')}
              variant="outline"
            >
              Quay lại Dashboard
            </Button>
            <Button
              onClick={() => {
                setShowAddForm(true);
                setEditingCourt(null);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Thêm sân mới
            </Button>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Add/Edit Form */}
        {(showAddForm || editingCourt) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingCourt ? 'Chỉnh sửa sân' : 'Thêm sân mới'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingCourt ? handleEditCourt : handleAddCourt} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tên sân *</label>
                    <Input
                      value={courtForm.name}
                      onChange={(e) => setCourtForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="VD: Sân 1"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Trạng thái</label>
                    <select
                      value={courtForm.status}
                      onChange={(e) => setCourtForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="Active">Hoạt động</option>
                      <option value="Inactive">Tạm ngưng</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-4">Thiết lập giá theo ngày</label>
                  <div className="space-y-4">
                    {courtForm.pricing.map((pricing, index) => (
                      <div key={pricing.dayOfWeek} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <span className="font-medium">{getDayName(pricing.dayOfWeek)}</span>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Giờ bắt đầu</label>
                          <Input
                            type="time"
                            value={pricing.startTime}
                            onChange={(e) => updatePricing(index, 'startTime', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Giờ kết thúc</label>
                          <Input
                            type="time"
                            value={pricing.endTime}
                            onChange={(e) => updatePricing(index, 'endTime', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Giá (VNĐ)</label>
                          <Input
                            type="number"
                            value={pricing.price}
                            onChange={(e) => updatePricing(index, 'price', parseInt(e.target.value) || 0)}
                            min="0"
                            step="1000"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {editingCourt ? 'Cập nhật' : 'Thêm sân'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Courts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courts.map((court) => (
            <Card key={court.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{court.name}</CardTitle>
                  <Badge variant={court.status === 'Active' ? 'default' : 'secondary'}>
                    {court.status === 'Active' ? 'Hoạt động' : 'Tạm ngưng'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      Bảng giá
                    </h4>
                    <div className="space-y-1 text-sm">
                      {court.pricing.map((pricing, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{getDayName(pricing.dayOfWeek)}</span>
                          <span className="font-medium">{formatPrice(pricing.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(court)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCourt(court.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Xóa
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {courts.length === 0 && !showAddForm && !editingCourt && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Chưa có sân nào</h3>
                <p className="mb-4">Bắt đầu bằng cách thêm sân đầu tiên cho khu phức hợp của bạn.</p>
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm sân mới
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

