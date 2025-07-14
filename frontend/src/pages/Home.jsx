import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { Search, MapPin } from 'lucide-react';

const Home = () => {
  const [courtComplexes, setCourtComplexes] = useState([]);
  const [sportTypes, setSportTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSportType, setSelectedSportType] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [complexesRes, sportTypesRes] = await Promise.all([
        api.get('/court-complexes'),
        api.get('/court-complexes/sport-types')
      ]);
      
      setCourtComplexes(complexesRes.data.courtComplexes || []);
      setSportTypes(sportTypesRes.data.sportTypes || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setCourtComplexes([]);
      setSportTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedSportType) params.append('sport_type_id', selectedSportType);
      if (selectedCity) params.append('city', selectedCity);

      const response = await api.get(`/court-complexes?${params.toString()}`);
      setCourtComplexes(response.data.courtComplexes || []);
    } catch (error) {
      console.error('Error searching:', error);
      setCourtComplexes([]);
    } finally {
      setLoading(false);
    }
  };

  const cities = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Đặt sân thể thao
              <span className="block text-blue-200">dễ dàng và nhanh chóng</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Tìm kiếm và đặt sân thể thao yêu thích của bạn chỉ với vài cú click
            </p>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-6 -mt-16 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tìm kiếm
                </label>
                <Input
                  placeholder="Tên sân, địa chỉ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại hình thể thao
                </label>
                <select
                  value={selectedSportType}
                  onChange={(e) => setSelectedSportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tất cả</option>
                  {sportTypes.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thành phố
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tất cả</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} className="w-full">
                  <Search className="w-4 h-4 mr-2" />
                  Tìm kiếm
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Khu phức hợp sân thể thao
            </h2>
            <p className="text-gray-600">
              Tìm thấy {courtComplexes.length} kết quả
            </p>
          </div>

          {courtComplexes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Không tìm thấy kết quả
              </h3>
              <p className="text-gray-600">
                Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courtComplexes.map((complex) => (
                <Card key={complex.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="p-0">
                    {complex.primaryImage ? (
                      <img
                        src={complex.primaryImage}
                        alt={complex.name}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                        <span className="text-gray-400">Không có hình ảnh</span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg font-semibold">
                        {complex.name}
                      </CardTitle>
                      <Badge variant="secondary">
                        {complex.sportType}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-4">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm">
                        {complex.district}, {complex.city}
                      </span>
                    </div>

                    {complex.amenities && complex.amenities.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {complex.amenities.slice(0, 3).map((amenity) => (
                            <Badge key={amenity.id} variant="outline" className="text-xs">
                              {amenity.name}
                            </Badge>
                          ))}
                          {complex.amenities.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{complex.amenities.length - 3} khác
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <Button asChild className="w-full">
                      <Link to={`/court-complex/${complex.id}`}>
                        Xem chi tiết
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;

