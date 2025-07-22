import React, { useState } from 'react';
// import { Button } from '@/components/ui/button'; // Không cần Button này nữa nếu bạn chỉ dùng nút Google
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';
import { storeUser, storeToken } from '@/lib/auth';

// Thêm import này
import { GoogleLogin } from '@react-oauth/google';

const GoogleLoginButton = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false); // Có thể không cần loading nếu dùng GoogleLogin component
  const [error, setError] = useState('');

  // Hàm này sẽ được gọi khi đăng nhập Google thành công
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');

    try {
      // credentialResponse.credential chứa ID token thực sự từ Google
      const response = await api.post('/auth/google', {
        token: credentialResponse.credential, // Gửi ID token thực sự đến backend
        // Bạn không cần gửi 'user: mockGoogleUser' nữa,
        // vì backend sẽ xác minh ID token và trích xuất thông tin người dùng từ đó.
        // Tuy nhiên, nếu backend của bạn vẫn cần 'user' object,
        // bạn sẽ cần parse credentialResponse.credential để lấy thông tin.
        // Ví dụ: const decodedToken = jwt_decode(credentialResponse.credential);
        // và gửi decodedToken.
      });

      if (response.data.access_token) {
        storeToken(response.data.access_token);
        storeUser(response.data.user); // Backend sẽ trả về thông tin user đã xác thực

        if (onSuccess) {
          onSuccess(response.data.user);
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Đăng nhập Google thất bại';
      setError(errorMessage);

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Hàm này sẽ được gọi khi đăng nhập Google thất bại
  const handleGoogleError = () => {
    setError('Đăng nhập Google thất bại');
    if (onError) {
      onError('Đăng nhập Google thất bại');
    }
  };

  return (
    <div>
      {/* Sử dụng component GoogleLogin thực sự */}
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        // Bạn có thể thêm các props khác như 'useOneTap', 'size', 'text-align'
        // Xem tài liệu của @react-oauth/google để biết thêm:
        // https://www.npmjs.com/package/@react-oauth/google
      />

      {error && (
        <Alert className="mt-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default GoogleLoginButton;