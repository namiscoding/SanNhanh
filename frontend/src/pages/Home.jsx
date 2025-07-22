// frontend/src/pages/Home.jsx

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Star, Clock, DollarSign, Users, Filter, CheckCircle, XCircle, Building2, Zap, Award, TrendingUp, Globe } from 'lucide-react';
import api from '@/lib/api';

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courtComplexes, setCourtComplexes] = useState([]);
  const [cities, setCities] = useState([]); 
  const [sportTypes, setSportTypes] = useState([]); // Sẽ là list of strings
  const [filters, setFilters] = useState({
    search: '',
    city: '',
    sportType: '' // Sẽ là tên môn thể thao (chuỗi)
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchCourtComplexes();
  }, [filters, pagination.page]);

  const fetchInitialData = async () => {
    try {
      const [citiesResponse, sportTypesResponse] = await Promise.all([
        api.get('/public/cities'),
        api.get('/public/sport-types')
      ]);
      
      // SỬA ĐỔI: Đảm bảo truy cập đúng key và là mảng, và lưu trữ là list of strings
      setCities(citiesResponse.data.cities || []);
      setSportTypes(sportTypesResponse.data.sportTypes || []);
      
      console.log('Fetched Cities:', citiesResponse.data.cities);
      console.log('Fetched Sport Types:', sportTypesResponse.data.sportTypes);

    } catch (error) {
      console.error('Error fetching initial data for filters:', error.response?.data?.error || error.message || error);
    }
  };

  const fetchCourtComplexes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.city) params.append('city', filters.city);
      if (filters.sportType) params.append('sportType', filters.sportType); // Gửi tên môn thể thao (chuỗi)

      const response = await api.get(`/public/court-complexes?${params}`);
      setCourtComplexes(response.data.courtComplexes || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.totalItems,
        totalPages: response.data.totalPages
      }));
    } catch (error) {
      console.error('Error fetching court complexes:', error.response?.data?.error || error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    // fetchCourtComplexes sẽ được gọi tự động qua useEffect
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
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

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }

    return stars;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
      {/* Hero Section với Background Pattern */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 text-white pb-20 pt-24 md:pt-32">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
        </div>

        {/* Floating Sports Icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 animate-bounce animation-delay-1000">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl">⚽</span>
            </div>
          </div>
          <div className="absolute top-32 right-20 animate-bounce animation-delay-2000">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl">🏀</span>
            </div>
          </div>
          <div className="absolute bottom-40 left-20 animate-bounce animation-delay-3000">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl">🏸</span>
            </div>
          </div>
          <div className="absolute bottom-20 right-32 animate-bounce animation-delay-4000">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl">🎾</span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            {/* Hero Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-6 border border-white/30">
              <Zap className="w-4 h-4 mr-2 text-yellow-300" />
              <span>Nền tảng đặt sân thể thao hàng đầu Việt Nam</span>
            </div>

            <h1 className="text-4xl md:text-7xl font-extrabold mb-6 leading-tight bg-gradient-to-r from-white via-yellow-100 to-green-100 bg-clip-text text-transparent">
              Đặt Sân Thể Thao Dễ Dàng Với 
              <span className="block text-yellow-300 animate-pulse">SportSync</span>
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-green-100 opacity-90 max-w-3xl mx-auto">
              Tìm kiếm và đặt sân thể thao yêu thích của bạn chỉ với vài cú click. 
              <span className="block mt-2 font-semibold">Hơn 1000+ sân trên toàn quốc đang chờ bạn!</span>
            </p>
            
            {/* Search Form với Enhanced Design */}
            <form onSubmit={handleSearchSubmit} className="bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl max-w-5xl mx-auto border border-white/20 transform hover:scale-[1.02] transition-all duration-300">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div className="md:col-span-2">
                  <label htmlFor="search-input" className="block text-sm font-semibold text-gray-700 mb-2">Tìm kiếm sân thể thao</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="search-input"
                      type="text"
                      placeholder="Tên sân, địa chỉ, khu vực..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="w-full pl-10 text-gray-800 border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 rounded-xl h-12 transition-all duration-200"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="city-select" className="block text-sm font-semibold text-gray-700 mb-2">Thành phố</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      id="city-select"
                      value={filters.city}
                      onChange={(e) => handleFilterChange('city', e.target.value)}
                      className="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl bg-white text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-200 h-12 appearance-none cursor-pointer transition-all duration-200"
                    >
                      <option value="">Tất cả thành phố</option>
                      {cities.map(city => (
                        <option key={city} value={city}>{city}</option> 
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="sportType-select" className="block text-sm font-semibold text-gray-700 mb-2">Môn thể thao</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      id="sportType-select"
                      value={filters.sportType}
                      onChange={(e) => handleFilterChange('sportType', e.target.value)}
                      className="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl bg-white text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-200 h-12 appearance-none cursor-pointer transition-all duration-200"
                    >
                      <option value="">Tất cả môn thể thao</option>
                      {sportTypes.map(sport => ( 
                        <option key={sport} value={sport}>{sport}</option> 
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-center">
                <Button type="submit" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-12 py-4 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-green-500">
                  <Search className="w-6 h-6 mr-3" />
                  Tìm kiếm ngay
                </Button>
              </div>
            </form>

            {/* Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-4xl mx-auto">
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-yellow-300">1000+</div>
                <div className="text-sm text-green-100">Sân thể thao</div>
              </div>
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-yellow-300">50+</div>
                <div className="text-sm text-green-100">Thành phố</div>
              </div>
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-yellow-300">10K+</div>
                <div className="text-sm text-green-100">Người dùng</div>
              </div>
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-yellow-300">4.8★</div>
                <div className="text-sm text-green-100">Đánh giá</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center">
              <Award className="w-8 h-8 mr-3 text-green-600" />
              Kết quả tìm kiếm sân
            </h2>
            <p className="text-gray-600 text-lg flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
              Tìm thấy <span className="font-bold text-green-600 mx-1">{pagination.total}</span> khu phức hợp phù hợp
            </p>
          </div>
          
          <Link 
            to="/search" 
            className="text-green-600 hover:text-green-700 font-semibold flex items-center text-lg bg-green-50 hover:bg-green-100 px-6 py-3 rounded-xl transition-all duration-200 border-2 border-green-200 hover:border-green-300 shadow-sm hover:shadow-md"
          >
            <Filter className="w-5 h-5 mr-2" />
            Tìm kiếm nâng cao
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(pagination.limit)].map((_, index) => (
              <Card key={index} className="animate-pulse shadow-lg rounded-2xl overflow-hidden border-2 border-gray-100">
                <div className="h-56 bg-gradient-to-r from-gray-200 to-gray-300 rounded-t-2xl"></div>
                <CardContent className="p-6">
                  <div className="h-7 bg-gray-200 rounded-lg mb-3 w-3/4"></div>
                  <div className="h-5 bg-gray-200 rounded-lg mb-4 w-1/2"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                  <div className="mt-6 h-12 bg-gray-200 rounded-xl"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courtComplexes.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courtComplexes.map((complex) => (
                <Card 
                  key={complex.id} 
                  className="group overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer border-2 border-gray-100 hover:border-green-200 bg-white transform hover:-translate-y-2 hover:scale-[1.02]"
                  onClick={() => navigate(`/court-complex/${complex.id}`)}
                >
                  <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    {complex.mainImage ? (
                      <img
                        src={complex.mainImage}
                        alt={complex.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center group-hover:from-green-200 group-hover:to-green-300 transition-all duration-500">
                        <Building2 className="w-20 h-20 text-green-500 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                    )}
                    
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="absolute top-4 right-4 transform group-hover:scale-110 transition-transform duration-300">
                      <Badge className="bg-gradient-to-r from-green-600 to-green-700 text-white text-sm px-4 py-2 rounded-full shadow-lg border-2 border-white/20 backdrop-blur-sm">
                        {complex.sportType}
                      </Badge>
                    </div>
                    
                    {complex.rating > 0 && (
                      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md rounded-full px-4 py-2 flex items-center space-x-2 shadow-lg border border-white/50 transform group-hover:scale-105 transition-transform duration-300">
                        <div className="flex">
                          {renderStars(complex.rating)}
                        </div>
                        <span className="text-sm font-bold text-gray-800">
                          {complex.rating.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          {complex.totalReviews}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-6">
                    <CardTitle className="text-xl mb-3 line-clamp-1 text-gray-900 group-hover:text-green-700 transition-colors duration-300 font-bold">
                      {complex.name}
                    </CardTitle>
                    
                    <div className="space-y-3 text-sm text-gray-700">
                      <div className="flex items-center bg-gray-50 p-2 rounded-lg">
                        <MapPin className="w-4 h-4 mr-3 text-green-500 flex-shrink-0" />
                        <span className="line-clamp-1">{complex.address}, {complex.city}</span>
                      </div>
                      
                      <div className="flex items-center bg-gray-50 p-2 rounded-lg">
                        <Clock className="w-4 h-4 mr-3 text-blue-500 flex-shrink-0" />
                        <span className="font-medium">{complex.openTime} - {complex.closeTime}</span>
                      </div>
                      
                      <div className="flex items-center bg-gray-50 p-2 rounded-lg">
                        <Users className="w-4 h-4 mr-3 text-purple-500 flex-shrink-0" />
                        <span className="font-medium">{complex.courtCount} sân khả dụng</span>
                      </div>
                      
                      {complex.priceRange?.min > 0 && (
                        <div className="flex items-center bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border-l-4 border-green-500">
                          <DollarSign className="w-5 h-5 mr-3 text-green-600 flex-shrink-0" />
                          <span className="font-bold text-green-700 text-base">
                            {formatPrice(complex.priceRange.min)} - {formatPrice(complex.priceRange.max)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* SỬA ĐỔI Ở ĐÂY: amenities là mảng chuỗi */}
                    {complex.amenities && complex.amenities.length > 0 && (
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                          {complex.amenities.slice(0, 3).map((amenity, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 rounded-full hover:from-blue-100 hover:to-indigo-100 transition-colors duration-200">
                              {amenity} {/* amenity bây giờ là một chuỗi */}
                            </Badge>
                          ))}
                          {complex.amenities.length > 3 && (
                            <Badge variant="secondary" className="text-xs px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 rounded-full">
                              +{complex.amenities.length - 3} tiện ích
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-6">
                      <Button 
                        onClick={() => navigate(`/court-complex/${complex.id}`)} 
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 border-2 border-green-500"
                      >
                        <Globe className="w-5 h-5 mr-2" />
                        Xem chi tiết & Đặt sân
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Enhanced Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center mt-12">
                <div className="flex items-center space-x-2 bg-white rounded-2xl p-2 shadow-lg border-2 border-gray-100">
                  <Button
                    variant="outline"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="rounded-xl border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                  >
                    ← Trước
                  </Button>
                  
                  {[...Array(pagination.totalPages)].map((_, index) => {
                    const pageNum = index + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.page === pageNum ? "default" : "outline"}
                        onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                        className={`rounded-xl border-2 transition-all duration-200 ${
                          pagination.page === pageNum 
                            ? 'bg-gradient-to-r from-green-600 to-green-700 border-green-500 text-white shadow-md' 
                            : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  <Button
                    variant="outline"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="rounded-xl border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                  >
                    Sau →
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-white rounded-3xl border-2 border-gray-200 shadow-xl">
            <div className="relative inline-block mb-6">
              <XCircle className="w-24 h-24 mx-auto text-red-400 animate-pulse" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-bounce"></div>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-800">Không tìm thấy sân phù hợp</h3>
            <p className="mb-6 text-gray-600 text-lg max-w-md mx-auto">
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc để tìm thấy sân thể thao phù hợp với bạn
            </p>
            <Button
              onClick={() => {
                setFilters({ search: '', city: '', sportType: '' });
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <Search className="w-5 h-5 mr-2" />
              Xóa bộ lọc và tìm lại
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}