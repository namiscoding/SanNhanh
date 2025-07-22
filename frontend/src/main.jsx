import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// Thêm import này
import { GoogleOAuthProvider } from '@react-oauth/google';

// Đảm bảo file .env của frontend có VITE_GOOGLE_CLIENT_ID
// Ví dụ: VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_FROM_GOOGLE_CLOUD
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Kiểm tra để đảm bảo CLIENT_ID không rỗng
if (!GOOGLE_CLIENT_ID) {
  console.error("VITE_GOOGLE_CLIENT_ID is not defined in frontend/.env. Google OAuth will not work.");
  // Bạn có thể chọn cách xử lý khác ở đây, ví dụ: throw new Error
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
