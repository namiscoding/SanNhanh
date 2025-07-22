import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminUsers from './pages/AdminUsers';
import CourtComplexDetail from './pages/CourtComplexDetail';
import Booking from './pages/Booking';
import Payment from './pages/Payment';
import MyBookings from './pages/MyBookings';
import OwnerDashboard from './pages/OwnerDashboard';
import Profile from './pages/Profile';
import Search from './pages/Search'
import OwnerSetup from './pages/OwnerSetup';
import EditCourtComplex from './pages/EditCourtComplex';
import ManageCourts from './pages/ManageCourts';
import WalkInBooking from './pages/WalkInBooking';
import OwnerBookings from './pages/OwnerBookings.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} /> 
          <Route path="/admin-users" element={<AdminUsers />} />
          <Route path="/owner-dashboard" element={<OwnerDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/owner-setup" element={<OwnerSetup />} />
          <Route path="/owner/edit-complex/:complexId" element={<EditCourtComplex />} />
          <Route path="/owner/manage-courts/:complexId" element={<ManageCourts />} />
          <Route path="/search" element={<Search />} />
          <Route path="/court-complex/:complexId" element={<CourtComplexDetail />} />
          <Route path="/booking/:courtId" element={<Booking />} />
          <Route path="/payment/:bookingId" element={<Payment />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/owner/walk-in-booking" element={<WalkInBooking />} />
          <Route path="/owner/bookings" element={<OwnerBookings />} /> 
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

