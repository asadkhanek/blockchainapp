import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Spinner from '../Spinner/Spinner';

const AdminRoute = ({ isAuthenticated, loading, user }) => {
  if (loading) {
    return <Spinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/dashboard" />;
};

export default AdminRoute;
