import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import CustomerRegister from './pages/CustomerRegister';
import DriverRegister from './pages/DriverRegister';
import CustomerDashboard from './pages/CustomerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import OperatorDashboard from './pages/OperatorDashboard';
import TrackingPage from './pages/TrackingPage';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import ProtectedRoute from './components/ProtectedRoute';

import { useAppStore } from './store/useAppStore';

import { useLocation } from 'react-router-dom';

function AppLayout() {
  const location = useLocation();
  const fullScreenRoutes = ['/', '/login', '/register-customer', '/register-driver', '/admin/login', '/operator/login'];
  const isFullScreen = fullScreenRoutes.includes(location.pathname);

  return (
    <div className={isFullScreen ? "w-full min-h-screen" : "app-container"}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register-customer" element={<CustomerRegister />} />
          <Route path="/register-driver" element={<DriverRegister />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/customer-dash" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/driver-dash" element={<ProtectedRoute allowedRoles={['driver']}><DriverDashboard /></ProtectedRoute>} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/operator/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} fallbackPath="/admin/login"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/operator" element={<ProtectedRoute allowedRoles={['operator']} fallbackPath="/operator/login"><OperatorDashboard /></ProtectedRoute>} />
          <Route path="/track/:rideId" element={<TrackingPage />} />
        </Routes>
    </div>
  );
}

function App() {
  React.useEffect(() => {
    useAppStore.getState().initialize();
  }, []);

  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
