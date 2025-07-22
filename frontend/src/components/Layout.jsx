// frontend/src/components/Layout.jsx

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { isAuthenticated, getStoredUser, logout } from '@/lib/auth';
import { Menu, X, User, LogOut, Calendar, Settings, Home, LayoutDashboard, Search, FileText, Trophy, Zap } from 'lucide-react';

const Layout = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      if (isAuthenticated()) {
        setUser(getStoredUser());
      } else {
        setUser(null);
      }
    };

    checkAuth();

    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('authChange', handleAuthChange);

    setIsMenuOpen(false);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setUser(null);
    window.dispatchEvent(new Event('authChange'));
    navigate('/login');
    setIsMenuOpen(false);
  };

  const getNavItems = () => {
    const commonItems = [
      { path: '/', label: 'Trang chủ', icon: <Home className="w-4 h-4 mr-2" /> },
      { path: '/search', label: 'Tìm sân', icon: <Search className="w-4 h-4 mr-2" /> },
    ];

    if (!user) {
      return commonItems;
    }

    let userSpecificItems = [];

    if (user.role === 'Admin') {
      userSpecificItems.push({ path: '/admin', label: 'Quản trị', icon: <Settings className="w-4 h-4 mr-2" /> });
    }

    if (user.role === 'Owner') {
      userSpecificItems.push(
        { path: '/owner-dashboard', label: 'Dashboard Chủ sân', icon: <LayoutDashboard className="w-4 h-4 mr-2" /> },
        { path: '/owner/bookings', label: 'Quản lý đơn đặt', icon: <Calendar className="w-4 h-4 mr-2" /> }
      );
    }
    
    userSpecificItems.push({ path: '/my-bookings', label: 'Lịch sử đặt sân', icon: <FileText className="w-4 h-4 mr-2" /> });

    return [...commonItems, ...userSpecificItems].filter(Boolean); 
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-green-50">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-md shadow-lg border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center">
                    <Zap className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-black bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                    SportSync
                  </span>
                  <div className="text-xs text-gray-500 font-medium -mt-1">Đặt sân dễ dàng</div>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {getNavItems().map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-2.5 text-sm font-semibold transition-all duration-200 rounded-xl relative overflow-hidden group ${
                    location.pathname === item.path 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25' 
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
                >
                  <div className={`transition-transform duration-200 group-hover:scale-110 ${location.pathname === item.path ? 'text-white' : 'text-green-600'}`}>
                    {item.icon}
                  </div>
                  <span className="relative z-10">{item.label}</span>
                  {location.pathname !== item.path && (
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  )}
                </Link>
              ))}
            </div>

            {/* User Menu */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  <Link to="/profile" className="flex items-center space-x-3 p-2 pr-4 rounded-xl hover:bg-gray-50 transition-all duration-200 group border border-transparent hover:border-gray-200 hover:shadow-md">
                    <div className="relative">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.fullName}
                          className="w-9 h-9 rounded-xl object-cover ring-2 ring-green-500/20 group-hover:ring-green-500/40 transition-all duration-200"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl flex items-center justify-center group-hover:from-green-400 group-hover:to-emerald-500 transition-all duration-200">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors duration-200">{user.fullName}</p>
                      <p className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'Owner' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {user.role}
                      </p>
                    </div>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLogout} 
                    className="text-gray-600 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 transition-all duration-200 rounded-xl"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Đăng xuất
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Button variant="outline" asChild className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 rounded-xl font-semibold transition-all duration-200">
                    <Link to="/login">Đăng nhập</Link>
                  </Button>
                  <Button asChild className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 rounded-xl font-semibold transition-all duration-200 hover:scale-105">
                    <Link to="/register">Đăng ký</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? (
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden transition-all duration-300 ease-out">
            <div className="px-4 pt-3 pb-4 space-y-2 bg-white/95 backdrop-blur-md border-t border-gray-100">
              {getNavItems().map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200 ${
                    location.pathname === item.path 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className={location.pathname === item.path ? 'text-white' : 'text-green-600'}>
                    {item.icon}
                  </div>
                  {item.label}
                </Link>
              ))}
              {user ? (
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
                  <Link to="/profile" className="flex items-center px-4 py-3 space-x-3 text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-200" onClick={() => setIsMenuOpen(false)}>
                    <div className="relative">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.fullName}
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-green-500/20"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{user.fullName}</p>
                      <p className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'Owner' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {user.role}
                      </p>
                    </div>
                  </Link>
                  <Button
                    onClick={handleLogout}
                    className="w-full justify-start px-4 py-3 text-base font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all duration-200"
                    variant="ghost"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Đăng xuất
                  </Button>
                </div>
              ) : (
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
                  <Link
                    to="/login"
                    className="block px-4 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-all duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="block px-4 py-3 text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl transition-all duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 pb-12">
        {children}
      </main>

      {/* Enhanced Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="relative z-10 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <span className="text-3xl font-black bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                      SportSync
                    </span>
                    <div className="text-sm text-gray-400 font-medium">Đặt sân dễ dàng</div>
                  </div>
                </div>
                <p className="text-gray-300 mb-6 text-base leading-relaxed max-w-md">
                  Hệ thống đặt sân thể thao hàng đầu Việt Nam. 
                  Kết nối đam mê thể thao, tạo nên những trải nghiệm tuyệt vời.
                </p>
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Chất lượng hàng đầu</div>
                    <div className="text-xs text-gray-400">Đáng tin cậy & chuyên nghiệp</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-white mb-6 relative">
                  Dịch vụ
                  <div className="absolute -bottom-2 left-0 w-8 h-0.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></div>
                </h3>
                <ul className="space-y-3">
                  <li><Link to="/search" className="text-gray-300 hover:text-green-400 transition-colors duration-200 flex items-center group"><Search className="w-4 h-4 mr-2 opacity-60 group-hover:opacity-100 transition-opacity" />Tìm sân</Link></li>
                  <li><Link to="/my-bookings" className="text-gray-300 hover:text-green-400 transition-colors duration-200 flex items-center group"><FileText className="w-4 h-4 mr-2 opacity-60 group-hover:opacity-100 transition-opacity" />Lịch sử đặt sân</Link></li>
                  <li><a href="#" className="text-gray-300 hover:text-green-400 transition-colors duration-200 flex items-center group"><Settings className="w-4 h-4 mr-2 opacity-60 group-hover:opacity-100 transition-opacity" />Hỗ trợ</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-white mb-6 relative">
                  Liên hệ
                  <div className="absolute -bottom-2 left-0 w-8 h-0.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></div>
                </h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start space-x-2">
                    <div className="w-5 h-5 mt-0.5 bg-green-500/20 rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-400 rounded"></div>
                    </div>
                    <div>
                      <div className="font-medium text-white">Email</div>
                      <div className="text-sm">support@sannhanh.online</div>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-5 h-5 mt-0.5 bg-blue-500/20 rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-400 rounded"></div>
                    </div>
                    <div>
                      <div className="font-medium text-white">Hotline</div>
                      <div className="text-sm">0823281223</div>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-5 h-5 mt-0.5 bg-orange-500/20 rounded flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-orange-400 rounded"></div>
                    </div>
                    <div>
                      <div className="font-medium text-white">Địa chỉ</div>
                      <div className="text-sm">Hà Nội, Việt Nam</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-700/50 mt-12 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <p className="text-sm text-gray-400">
                  © {new Date().getFullYear()} SportSync. Tất cả quyền được bảo lưu.
                </p>
                <div className="flex items-center space-x-6">
                  <a href="#" className="text-gray-400 hover:text-green-400 text-sm transition-colors duration-200">Điều khoản</a>
                  <a href="#" className="text-gray-400 hover:text-green-400 text-sm transition-colors duration-200">Bảo mật</a>
                  <a href="#" className="text-gray-400 hover:text-green-400 text-sm transition-colors duration-200">Hỗ trợ</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;