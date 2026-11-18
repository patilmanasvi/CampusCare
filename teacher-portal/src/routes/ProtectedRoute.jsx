// src/routes/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <LoadingSpinner label="Checking your session…" size="lg" />
      </div>
    );
  }
  if (status !== 'signedIn') {
    // Remember where the teacher was going (e.g. a QR link) and return after login.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
