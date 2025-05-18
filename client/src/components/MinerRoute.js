import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Spinner from '../Spinner/Spinner';

const MinerRoute = ({ isAuthenticated, loading, user }) => {
  if (loading) {
    return <Spinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Allow both miners and admins
  return user?.role === 'miner' || user?.role === 'admin' ? <Outlet /> : <Navigate to="/dashboard" />;
};

export default MinerRoute;
