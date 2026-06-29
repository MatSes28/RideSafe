import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function ProtectedRoute({ children, allowedRoles, fallbackPath = "/login" }) {
  const isInitialized = useAppStore(state => state.isInitialized);
  const currentUser = useAppStore(state => state.currentUser);
  const userRole = useAppStore(state => state.userRole);

  if (!isInitialized) {
    return <div className="flex h-screen items-center justify-center bg-surface-color text-primary"><div className="pulse-circle"></div></div>;
  }

  if (!currentUser) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // If they are logged in but don't have the right role, send them back to their appropriate dashboard
    if (userRole === 'driver') return <Navigate to="/driver-dash" replace />;
    if (userRole === 'admin') return <Navigate to="/admin" replace />;
    if (userRole === 'operator') return <Navigate to="/operator" replace />;
    return <Navigate to="/customer-dash" replace />;
  }

  return children;
}
