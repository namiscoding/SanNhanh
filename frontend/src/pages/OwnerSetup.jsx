import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';
import { 
  Building2, 
  MapPin, 
  Clock, 
  Camera, 
  Plus, 
  Trash2, 
  Check,
  ArrowLeft,
  ArrowRight,
  Upload
} from 'lucide-react';

const OwnerSetup = () => {
  const navigate = useNavigate();
  const [setupData, setSetupData] = useState(null);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form data
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
  
  const [courts, setCourts] = useState([
    { name: 'Sân 1', pricing: [{ dayOfWeek: 'All', startTime: '06:00', endTime: '22:00', price: 100000 }] }
  ]);

  useEffect(() => {
    fetchSetupData();
  }, []);

  const fetchSetupData = async () => {
    try {
      const [setupResponse, banksResponse] = await Promise.all([
        api.get('/owner/setup-data'),
        api.get('/owner/banks')
      ]);
      
      setSetupData(setupResponse.data);
      setBanks(banksResponse.data.banks || []);
    } catch (error) {
      console.error('Error fetching setup data:', error);
      setError('Không thể tải dữ liệu thiết lập');
    }
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setComplexData(prev => ({
            ...prev,
            images: [...prev.images, e.target.result]
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index) => {
    setComplexData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      mainImageIndex: prev.mainImageIndex >= index ? Math.max(0, prev.mainImageIndex - 1) : prev.mainImageIndex
    }));
  };

  const setMainImage = (index) => {
    setComplexData(prev => ({
      ...prev,
      mainImageIndex: index
    }));
  };

  const addCourt = () => {
    setCourts(prev => [...prev, {
      name: `Sân ${prev.length + 1}`,
      pricing: [{ dayOfWeek: 'All', startTime: '06:00', endTime: '22:00', price: 100000 }]
    }]);
  };

  const removeCourt = (index) => {
    if (courts.length > 1) {
      setCourts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateCourt = (index, field, value) => {
    setCourts(prev => prev.map((court, i) => 
      i === index ? { ...court, [field]: value } : court
    ));
  };

  const addPricing = (courtIndex) => {
    setCourts(prev => prev.map((court, i) => 
      i === courtIndex ? {
        ...court,
        pricing: [...court.pricing, { dayOfWeek: 'All', startTime: '06:00', endTime: '22:00', price: 100000 }]
      } : court
    ));
  };

  const removePricing = (courtIndex, pricingIndex) => {
    setCourts(prev => prev.map((court, i) => 
      i === courtIndex ? {
        ...court,
        pricing: court.pricing.filter((_, j) => j !== pricingIndex)
      } : court
    ));
  };

  const updatePricing = (courtIndex, pricingIndex, field, value) => {
    setCourts(prev => prev.map((court, i) => 
      i === courtIndex ? {
        ...court,
        pricing: court.pricing.map((pricing, j) => 
          j === pricingIndex ? { ...pricing, [field]: value } : pricing
        )
      } : court
    ));
  };

  const validateStep1 = () => {
    const required = ['name', 'address', 'city', 'phoneNumber', 'sportType'];
    return required.every(field => complexData[field].trim() !== '');
  };

  const validateStep2 = () => {
    return courts.every(court => 
      court.name.trim() !== '' && 
      court.pricing.length > 0 &&
      court.pricing.every(p => p.price > 0)
    );
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...complexData,
        courts: courts
      };

      const response = await api.post('/owner/court-complexes', submitData);
      
      if (response.data.complexId) {
        navigate('/owner');
      }
    } catch (error) {
      console.error('Error creating complex:', error);
      setError(error.response?.data?.error || 'Có lỗi xảy ra khi tạo khu phức hợp');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !validateStep1()) {
      setError('Vui lòng điền đầy đủ thông tin cơ bản');
      return;
    }
    setError('');
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  if (!setupData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step ? <Check className="w-5 h-5" /> : step}
                </div>
                {step < 3 && (
                  <div className={`w-20 h-1 mx-4 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span>Thông tin cơ bản</span>
            <span>Thiết lập sân</span>
            <span>Xác nhận</span>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
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
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Số điện thoại *</label>
                  <Input
                    value={complexData.phoneNumber}
                    onChange={(e) => setComplexData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="VD: 0123456789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Địa chỉ *</label>
                <Input
                  value={complexData.address}
                  onChange={(e) => setComplexData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="VD: 123 Đường ABC, Quận XYZ"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Thành phố *</label>
                  <select
                    value={complexData.city}
                    onChange={(e) => setComplexData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
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
                    <label className="block text-sm font-medium mb-2">Ngân hàng *</label>
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
                      required
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
                    <label className="block text-sm font-medium mb-2">Số tài khoản *</label>
                    <Input
                      value={complexData.accountNumber}
                      onChange={(e) => setComplexData(prev => ({ ...prev, accountNumber: e.target.value }))}
                      placeholder="VD: 1234567890"
                      required
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Tên chủ tài khoản *</label>
                  <Input
                    value={complexData.accountName}
                    onChange={(e) => setComplexData(prev => ({ ...prev, accountName: e.target.value }))}
                    placeholder="VD: NGUYEN VAN A"
                    required
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
                              onClick={() => setMainImage(index)}
                              className={`p-1 rounded-full ${
                                complexData.mainImageIndex === index
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-600'
                              }`}
                              title="Đặt làm ảnh đại diện"
                            >
                              <Camera className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => removeImage(index)}
                              className="p-1 bg-red-600 text-white rounded-full"
                              title="Xóa ảnh"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          {complexData.mainImageIndex === index && (
                            <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                              Ảnh đại diện
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Courts Setup */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Thiết lập sân và giá cả
                </div>
                <Button onClick={addCourt} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm sân
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {courts.map((court, courtIndex) => (
                <div key={courtIndex} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Sân {courtIndex + 1}</h3>
                    {courts.length > 1 && (
                      <Button
                        onClick={() => removeCourt(courtIndex)}
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Tên sân</label>
                    <Input
                      value={court.name}
                      onChange={(e) => updateCourt(courtIndex, 'name', e.target.value)}
                      placeholder="VD: Sân A, Sân B..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">Giá theo khung giờ</label>
                      <Button
                        onClick={() => addPricing(courtIndex)}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm khung giờ
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {court.pricing.map((pricing, pricingIndex) => (
                        <div key={pricingIndex} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Ngày trong tuần</label>
                            <select
                              value={pricing.dayOfWeek}
                              onChange={(e) => updatePricing(courtIndex, pricingIndex, 'dayOfWeek', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="All">Tất cả</option>
                              <option value="Monday">Thứ 2</option>
                              <option value="Tuesday">Thứ 3</option>
                              <option value="Wednesday">Thứ 4</option>
                              <option value="Thursday">Thứ 5</option>
                              <option value="Friday">Thứ 6</option>
                              <option value="Saturday">Thứ 7</option>
                              <option value="Sunday">Chủ nhật</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Từ giờ</label>
                            <Input
                              type="time"
                              value={pricing.startTime}
                              onChange={(e) => updatePricing(courtIndex, pricingIndex, 'startTime', e.target.value)}
                              className="text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Đến giờ</label>
                            <Input
                              type="time"
                              value={pricing.endTime}
                              onChange={(e) => updatePricing(courtIndex, pricingIndex, 'endTime', e.target.value)}
                              className="text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Giá (VNĐ)</label>
                            <Input
                              type="number"
                              value={pricing.price}
                              onChange={(e) => updatePricing(courtIndex, pricingIndex, 'price', parseInt(e.target.value) || 0)}
                              placeholder="100000"
                              className="text-sm"
                            />
                          </div>

                          <div>
                            {court.pricing.length > 1 && (
                              <Button
                                onClick={() => removePricing(courtIndex, pricingIndex)}
                                variant="outline"
                                size="sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Check className="w-5 h-5 mr-2" />
                Xác nhận thông tin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Thông tin khu phức hợp</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><strong>Tên:</strong> {complexData.name}</p>
                  <p><strong>Địa chỉ:</strong> {complexData.address}, {complexData.city}</p>
                  <p><strong>Loại thể thao:</strong> {complexData.sportType}</p>
                  <p><strong>Số điện thoại:</strong> {complexData.phoneNumber}</p>
                  <p><strong>Giờ hoạt động:</strong> {complexData.openTime} - {complexData.closeTime}</p>
                  {complexData.images.length > 0 && (
                    <p><strong>Số ảnh:</strong> {complexData.images.length} ảnh</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Danh sách sân</h3>
                <div className="space-y-3">
                  {courts.map((court, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-medium">{court.name}</p>
                      <div className="mt-2 space-y-1">
                        {court.pricing.map((pricing, pIndex) => (
                          <p key={pIndex} className="text-sm text-gray-600">
                            {pricing.dayOfWeek === 'All' ? 'Tất cả ngày' : pricing.dayOfWeek}: {pricing.startTime} - {pricing.endTime} = {pricing.price.toLocaleString()} VNĐ/giờ
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            onClick={prevStep}
            variant="outline"
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          {currentStep < 3 ? (
            <Button onClick={nextStep}>
              Tiếp theo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Đang tạo...' : 'Hoàn thành thiết lập'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerSetup;

