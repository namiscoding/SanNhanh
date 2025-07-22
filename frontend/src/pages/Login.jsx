import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import GoogleLoginButton from '@/components/GoogleLoginButton';
import api from '@/lib/api';
import { storeUser, storeToken } from '@/lib/auth';
import { Loader2 } from 'lucide-react'; // Import Loader2 cho spinner

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', formData);
      if (response.data.access_token) {
        storeToken(response.data.access_token);
        storeUser(response.data.user);
        
        // Dispatch custom event for auth change
        window.dispatchEvent(new Event('authChange'));
        
        navigate('/');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.'); // Thông báo lỗi rõ ràng hơn
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (user) => {
    // Redirect based on user role
    if (user.role === 'Admin') {
      navigate('/admin');
    } else if (user.role === 'Owner') { // Chuyển hướng owner về dashboard của họ
      navigate('/owner-dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8"> {/* Màu nền nhạt hơn */}
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center mb-6"> {/* Thêm margin bottom */}
            {/* Thay thế logo "SC" bằng hình ảnh logo SportSync */}
            <img 
              src="/sportsync-logo.png" // Đảm bảo đường dẫn này đúng
              alt="SportSync Logo" 
              className="h-16 w-auto" // Kích thước lớn hơn
            />
          </div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900"> {/* Giảm margin top */}
            Chào mừng trở lại!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Đăng nhập vào tài khoản của bạn
          </p>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hoặc{' '}
            <Link
              to="/register"
              className="font-medium text-green-600 hover:text-green-700 transition-colors" // Màu xanh lá cây
            >
              tạo tài khoản mới
            </Link>
          </p>
        </div>

        <Card className="shadow-lg rounded-lg border border-gray-200"> {/* Thêm shadow, rounded, border */}
          <CardHeader className="p-6 pb-0"> {/* Adjusted padding */}
            <CardTitle className="text-center text-2xl font-bold text-gray-800">Đăng nhập</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6"> {/* Adjusted padding */}
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200"> {/* Màu Alert rõ ràng hơn */}
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com" // Placeholder rõ ràng
                  className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500" // Cải thiện focus
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••" // Placeholder cho mật khẩu
                  className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded" // Màu xanh lá cây
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Ghi nhớ đăng nhập
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                    Quên mật khẩu?
                  </a>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-md" // Màu xanh lá cây
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Đăng nhập'
                )}
              </Button>
            </form>

            <div className="mt-6"> {/* Remove redundant mt-6 */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Hoặc</span>
                </div>
              </div>

              <div className="mt-6"> {/* Remove redundant mt-6 */}
                <GoogleLoginButton 
                  onSuccess={handleGoogleSuccess}
                  onError={setError}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;