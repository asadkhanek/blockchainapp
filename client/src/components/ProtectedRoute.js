import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Spinner from '../Spinner/Spinner';

const ProtectedRoute = ({ isAuthenticated, loading }) => {
  if (loading) {
    return <Spinner />;
  }
  
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
