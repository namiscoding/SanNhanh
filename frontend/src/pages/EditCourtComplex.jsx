import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Upload, Star, Trash2 } from 'lucide-react';
import api from '@/lib/api';

export default function EditCourtComplex() {
  const { complexId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [setupData, setSetupData] = useState(null);
  const [banks, setBanks] = useState([]);
  const [complexData, setComplexData] = useState({
    name: '',
    address: '',
    city: '',
    phoneNumber: '',
    sportType: '',
    description: '',
    googleMapLink: '',
    bankCode: '',
    accountNumber: '',
    accountName: '',
    openTime: '06:00',
    closeTime: '22:00',
    amenities: [],
    images: [],
    mainImageIndex: 0
  });

  useEffect(() => {
    fetchData();
  }, [complexId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch setup data, banks, and complex data in parallel
      const [setupResponse, banksResponse, complexResponse] = await Promise.all([
        api.get('/owner/setup-data'),
        api.get('/owner/banks'),
        api.get(`/owner/court-complexes/${complexId}`)
      ]);
      
      setSetupData(setupResponse.data);
      setBanks(banksResponse.data.banks || []);
      
      // Update complexData with bank info
      const complexInfo = complexResponse.data;
      setComplexData({
        ...complexInfo,
        bankCode: complexInfo.bankCode || '',
        accountNumber: complexInfo.accountNumber || '',
        accountName: complexInfo.accountName || ''
      });
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setComplexData(prev => ({
          ...prev,
          images: [...prev.images, event.target.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setComplexData(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      const newMainIndex = prev.mainImageIndex >= newImages.length ? 0 : prev.mainImageIndex;
      return {
        ...prev,
        images: newImages,
        mainImageIndex: newMainIndex
      };
    });
  };

  const setMainImage = (index) => {
    setComplexData(prev => ({
      ...prev,
      mainImageIndex: index
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const requiredFields = ['name', 'address', 'city', 'phoneNumber', 'sportType'];
    for (const field of requiredFields) {
      if (!complexData[field]) {
        setError(`Vui lòng điền đầy đủ thông tin bắt buộc.`);
        return;
      }
    }

    try {
      setSaving(true);
      setError('');
      
      await api.put(`/owner/court-complexes/${complexId}`, complexData);
      
      setSuccess('Cập nhật khu phức hợp thành công!');
      setTimeout(() => {
        navigate('/owner-dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error updating complex:', error);
      setError(error.response?.data?.error || 'Có lỗi xảy ra khi cập nhật.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!setupData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              Không thể tải dữ liệu. Vui lòng thử lại.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa khu phức hợp sân</h1>
          <p className="text-gray-600">Cập nhật thông tin khu phức hợp sân của bạn</p>
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

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Thông tin khu phức hợp sân
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tên khu phức hợp *</label>
                  <Input
                    value={complexData.name}
                    onChange={(e) => setComplexData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Sân thể thao ABC"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Số điện thoại *</label>
                  <Input
                    value={complexData.phoneNumber}
                    onChange={(e) => setComplexData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="VD: 0123456789"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Địa chỉ *</label>
                <Input
                  value={complexData.address}
                  onChange={(e) => setComplexData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="VD: 123 Đường ABC, Quận XYZ"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Thành phố *</label>
                  <select
                    value={complexData.city}
                    onChange={(e) => setComplexData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Chọn thành phố</option>
                    {setupData.cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Loại thể thao *</label>
                  <select
                    value={complexData.sportType}
                    onChange={(e) => setComplexData(prev => ({ ...prev, sportType: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Chọn loại thể thao</option>
                    {setupData.sportTypes.map(sport => (
                      <option key={sport.id} value={sport.name}>{sport.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Giờ mở cửa</label>
                  <Input
                    type="time"
                    value={complexData.openTime}
                    onChange={(e) => setComplexData(prev => ({ ...prev, openTime: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Giờ đóng cửa</label>
                  <Input
                    type="time"
                    value={complexData.closeTime}
                    onChange={(e) => setComplexData(prev => ({ ...prev, closeTime: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mô tả</label>
                <textarea
                  value={complexData.description}
                  onChange={(e) => setComplexData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows="3"
                  placeholder="Mô tả về khu phức hợp sân của bạn..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Link Google Maps</label>
                <Input
                  value={complexData.googleMapLink}
                  onChange={(e) => setComplexData(prev => ({ ...prev, googleMapLink: e.target.value }))}
                  placeholder="VD: https://maps.google.com/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dán link Google Maps để khách hàng dễ dàng tìm đường đến sân
                </p>
              </div>

              {/* Banking Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Thông tin ngân hàng (để nhận thanh toán)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Ngân hàng</label>
                    <select
                      value={complexData.bankCode}
                      onChange={(e) => {
                        const selectedBank = banks.find(bank => bank.bin === e.target.value);
                        setComplexData(prev => ({ 
                          ...prev, 
                          bankCode: e.target.value,
                          bankName: selectedBank ? selectedBank.name : ''
                        }));
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Chọn ngân hàng</option>
                      {banks.map(bank => (
                        <option key={bank.bin} value={bank.bin}>
                          {bank.shortName} - {bank.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Chọn ngân hàng để tạo QR thanh toán
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Số tài khoản</label>
                    <Input
                      value={complexData.accountNumber}
                      onChange={(e) => setComplexData(prev => ({ ...prev, accountNumber: e.target.value }))}
                      placeholder="VD: 1234567890"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Tên chủ tài khoản</label>
                  <Input
                    value={complexData.accountName}
                    onChange={(e) => setComplexData(prev => ({ ...prev, accountName: e.target.value }))}
                    placeholder="VD: NGUYEN VAN A"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tiện ích</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {setupData.amenities.map(amenity => (
                    <label key={amenity.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={complexData.amenities.includes(amenity.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setComplexData(prev => ({
                              ...prev,
                              amenities: [...prev.amenities, amenity.id]
                            }));
                          } else {
                            setComplexData(prev => ({
                              ...prev,
                              amenities: prev.amenities.filter(id => id !== amenity.id)
                            }));
                          }
                        }}
                      />
                      <span className="text-sm">{amenity.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Hình ảnh</label>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Tải ảnh lên</span>
                    </label>
                  </div>

                  {complexData.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {complexData.images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-md"
                          />
                          <div className="absolute top-2 right-2 flex space-x-1">
                            <button
                              type="button"
                              onClick={() => setMainImage(index)}
                              className={`p-1 rounded-full ${
                                complexData.mainImageIndex === index
                                  ? 'bg-yellow-500 text-white'
                                  : 'bg-gray-500 text-white'
                              }`}
                              title="Đặt làm ảnh đại diện"
                            >
                              <Star className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="p-1 bg-red-500 text-white rounded-full"
                              title="Xóa ảnh"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          {complexData.mainImageIndex === index && (
                            <div className="absolute bottom-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                              Ảnh đại diện
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/owner-dashboard')}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}

