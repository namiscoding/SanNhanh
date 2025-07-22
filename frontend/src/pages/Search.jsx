// frontend/src/pages/Search.jsx

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SlidersHorizontal } from 'lucide-react';
import { 
  Search as SearchIcon, 
  MapPin, 
  Star, 
  Filter,
  Calendar, 
  Clock,
  DollarSign,
  Users,
  Building2, 
  CheckCircle,
  XCircle,
  Loader2 
} from 'lucide-react';
import api from '@/lib/api';

export default function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [complexes, setComplexes] = useState([]);
  const [loadingComplexes, setLoadingComplexes] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [filterError, setFilterError] = useState('');

  const [apiCities, setApiCities] = useState([]);
  const [apiSportTypes, setApiSportTypes] = useState([]);

  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || '',
    city: searchParams.get('city') || '',
    sportType: searchParams.get('sportType') || '',
    minRating: searchParams.get('minRating') || '',
    priceRange: searchParams.get('priceRange') || '',
    date: searchParams.get('date') || '',
    time: searchParams.get('time') || ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const priceRanges = [
    { label: 'Dưới 100.000 VNĐ', value: '0-100000' },
    { label: '100.000 - 200.000 VNĐ', value: '100000-200000' },
    { label: '200.000 - 500.000 VNĐ', value: '200000-500000' },
    { label: 'Trên 500.000 VNĐ', value: '500000-999999999' }
  ];

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

  // FETCH DỮ LIỆU BAN ĐẦU CHO DROPDOWNS (CHỈ CHẠY MỘT LẦN)
  useEffect(() => {
    const fetchData = async () => {
      setLoadingFilters(true);
      try {
        const [citiesResponse, sportTypesResponse] = await Promise.all([
          api.get('/public/cities'),
          api.get('/public/sport-types')
        ]);

        setApiCities(citiesResponse.data.cities || []);
        setApiSportTypes(sportTypesResponse.data.sportTypes || []);
        
        console.log('Fetched Cities:', citiesResponse.data.cities);
        console.log('Fetched Sport Types:', sportTypesResponse.data.sportTypes);
        
      } catch (err) {
        console.error("Error fetching dropdown data:", err);
        setFilterError("Không thể tải danh sách thành phố và loại thể thao.");
      } finally {
        setLoadingFilters(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array means it runs once on mount

  // HÀM TÌM KIẾM CHÍNH - searchComplexes
  const searchComplexes = useCallback(async (currentPageToFetch = 1) => { // Thêm tham số mặc định cho page
    setLoadingComplexes(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPageToFetch.toString()); // Sử dụng tham số của hàm
      params.append('limit', pagination.limit.toString()); 

      if (filters.keyword) params.append('search', filters.keyword); 
      if (filters.city) params.append('city', filters.city);
      if (filters.sportType) params.append('sportType', filters.sportType);
      
      if (filters.minRating) params.append('minRating', filters.minRating);
      if (filters.priceRange) {
        const [minPrice, maxPrice] = filters.priceRange.split('-');
        if (minPrice) params.append('minPrice', minPrice);
        if (maxPrice) params.append('maxPrice', maxPrice);
      }
      if (filters.date) params.append('date', filters.date);
      if (filters.time) params.append('time', filters.time);
      
      const response = await api.get(`/public/court-complexes?${params.toString()}`);
      setComplexes(response.data.courtComplexes || []);
      setPagination({ // Cập nhật toàn bộ pagination object
        total: response.data.totalItems || 0,
        totalPages: response.data.totalPages || 0,
        page: response.data.currentPage || 1, // Cập nhật currentPage từ API response
        limit: pagination.limit // Giữ nguyên limit
      });

    } catch (error) {
      console.error('Search error:', error);
      setComplexes([]);
      // Optional: set pagination to default if error
      setPagination({ page: 1, limit: 12, total: 0, totalPages: 0 });
    } finally {
      setLoadingComplexes(false);
    }
  }, [filters, pagination.limit]); // filters và pagination.limit là dependencies


  // EFFECT ĐỂ GỌI searchComplexes KHI FILTERS HOẶC TRANG ĐỔI
  useEffect(() => {
    // Chỉ gọi searchComplexes khi filters đã được load và không có lỗi
    if (!loadingFilters && !filterError) {
        searchComplexes(pagination.page); // Truyền pagination.page vào hàm
    }
  }, [filters, pagination.page, loadingFilters, filterError, searchComplexes]); // Trigger search when filters or page change


  // EFFECT ĐỂ ĐỒNG BỘ URL PARAMS
  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) newSearchParams.set(key, value);
    });
    if (pagination.page !== 1) newSearchParams.set('page', pagination.page.toString());
    if (pagination.limit !== 12) newSearchParams.set('limit', pagination.limit.toString()); 
    setSearchParams(newSearchParams);
  }, [filters, pagination.page, pagination.limit, setSearchParams]);


  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Khi filters thay đổi, chúng ta reset page về 1
    setPagination(prev => ({ ...prev, page: 1 })); 
  };

  const handleSearchClick = () => {
    // Nút "Tìm kiếm" này chỉ cần đảm bảo page là 1 và trigger effect
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    const clearedFilters = {
      keyword: '',
      city: '',
      sportType: '',
      minRating: '',
      priceRange: '',
      date: '',
      time: ''
    };
    setFilters(clearedFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset page to 1 on clear
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            Tìm Sân Thể Thao
          </h1>
          <p className="text-lg text-gray-600">
            Khám phá các khu phức hợp sân phù hợp với nhu cầu của bạn
          </p>
        </div>

        {/* Search & Filter Card */}
        <Card className="p-6 shadow-lg rounded-xl border border-gray-100">
          <CardContent className="p-0">
            {loadingFilters ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-10 w-10 text-green-500 animate-spin" />
                <p className="ml-3 text-gray-600">Đang tải bộ lọc...</p>
              </div>
            ) : filterError ? (
              <Alert className="text-red-500 text-center py-4 bg-red-50 border-red-200">
                <AlertDescription>{filterError}</AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="lg:col-span-2">
                  <label htmlFor="keyword-input" className="block text-sm font-medium text-gray-700 mb-2">
                    Từ khóa tìm kiếm
                  </label>
                  <div className="relative">
                    <Input
                      id="keyword-input"
                      placeholder="Tên sân, địa chỉ, loại thể thao..."
                      value={filters.keyword}
                      onChange={(e) => handleFilterChange('keyword', e.target.value)}
                      className="pl-10 w-full text-gray-800 border-gray-300 focus:border-green-500"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="city-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Thành phố
                  </label>
                  <select
                    id="city-select"
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:border-green-500"
                  >
                    <option value="">Tất cả</option>
                    {apiCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 lg:col-span-1">
                    <Button onClick={handleSearchClick} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-md flex-grow">
                        <SearchIcon className="w-5 h-5 mr-2" />
                        Tìm kiếm
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => setShowFilters(!showFilters)}
                        className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-semibold py-2.5 rounded-md flex-shrink-0"
                    >
                        <SlidersHorizontal className="w-5 h-5" />
                    </Button>
                </div>
              </div>
            )}

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="sportType-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Loại thể thao
                  </label>
                  <select
                    id="sportType-select"
                    value={filters.sportType}
                    onChange={(e) => handleFilterChange('sportType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:border-green-500"
                  >
                    <option value="">Tất cả</option>
                    {apiSportTypes.map(sport => (
                      <option key={sport} value={sport}>{sport}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="minRating-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Đánh giá tối thiểu
                  </label>
                  <select
                    id="minRating-select"
                    value={filters.minRating}
                    onChange={(e) => handleFilterChange('minRating', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:border-green-500"
                  >
                    <option value="">Tất cả</option>
                    <option value="4">4+ sao</option>
                    <option value="3">3+ sao</option>
                    <option value="2">2+ sao</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priceRange-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Khoảng giá
                  </label>
                  <select
                    id="priceRange-select"
                    value={filters.priceRange}
                    onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:border-green-500"
                  >
                    <option value="">Tất cả</option>
                    {priceRanges.map(range => (
                      <option key={range.value} value={range.value}>{range.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="date-input" className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày
                  </label>
                  <Input
                    id="date-input"
                    name="date"
                    type="date"
                    value={filters.date}
                    onChange={(e) => handleFilterChange('date', e.target.value)}
                    className="w-full text-gray-800 border-gray-300 focus:border-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="time-input" className="block text-sm font-medium text-gray-700 mb-2">
                    Thời gian
                  </label>
                  <Input
                    id="time-input"
                    name="time"
                    type="time"
                    value={filters.time}
                    onChange={(e) => handleFilterChange('time', e.target.value)}
                    className="w-full text-gray-800 border-gray-300 focus:border-green-500"
                  />
                </div>

                <div className="flex items-end">
                  <Button variant="outline" onClick={clearFilters} className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-semibold py-2.5 rounded-md">
                    Xóa bộ lọc
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Kết quả tìm kiếm ({pagination.total} khu phức hợp)
          </h2>
        </div>

        {loadingComplexes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(pagination.limit)].map((_, index) => (
              <Card key={index} className="animate-pulse shadow-md rounded-lg border border-gray-100">
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-4 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="mt-4 h-10 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : complexes.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {complexes.map((complex) => (
                <Card 
                  key={complex.id} 
                  className="overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100"
                  onClick={() => navigate(`/court-complex/${complex.id}`)}
                >
                  <div className="relative h-48 bg-gray-100">
                    {complex.mainImage ? (
                      <img
                        src={complex.mainImage}
                        alt={complex.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Building2 className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-green-600 text-white text-sm px-3 py-1 rounded-full shadow">
                        {complex.sportType}
                      </Badge>
                    </div>
                    
                    {complex.rating > 0 && (
                      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1 shadow">
                        <div className="flex">
                          {renderStars(complex.rating)}
                        </div>
                        <span className="text-sm font-semibold text-gray-800">
                          {complex.rating.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({complex.totalReviews})
                        </span>
                      </div>
                    )}
                     {/* Removed status badge */}
                  </div>
                  
                  <CardContent className="p-4">
                    <CardTitle className="text-xl mb-2 line-clamp-1 text-gray-900">
                      {complex.name}
                    </CardTitle>
                    
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="line-clamp-1">{complex.address}, {complex.city}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-500" />
                        <span>{complex.openTime} - {complex.closeTime}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2 text-gray-500" />
                        <span>{complex.courtCount} sân</span>
                      </div>
                      
                      {complex.priceRange?.min > 0 && (
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="font-semibold text-green-700">
                            {formatPrice(complex.priceRange.min)} - {formatPrice(complex.priceRange.max)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {complex.amenities && complex.amenities.length > 0 && (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-1">
                          {complex.amenities.slice(0, 3).map((amenity, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 border-gray-200">
                              {amenity}
                            </Badge>
                          ))}
                          {complex.amenities.length > 3 && (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 border-gray-200">
                              +{complex.amenities.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <Button onClick={() => navigate(`/court-complex/${complex.id}`)} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg">
                        Xem chi tiết & Đặt sân
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Trước
                  </Button>
                  
                  {[...Array(pagination.totalPages)].map((_, index) => {
                    const pageNum = index + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.page === pageNum ? "default" : "outline"}
                        onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  <Button
                    variant="outline"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-medium mb-2">Không tìm thấy sân phù hợp</h3>
            <p className="mb-4">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
            <Button
              onClick={clearFilters}
              variant="outline"
            >
              Xóa bộ lọc
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}