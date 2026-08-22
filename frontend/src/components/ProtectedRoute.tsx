import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ allowedRole?: string }> = ({ allowedRole = 'patient' }) => {
  const { user, loading, token } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0c121e' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="skeleton" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 1.5rem auto' }} />
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Securing clinical session...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
