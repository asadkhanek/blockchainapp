import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import './App.css';

// Layout Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import MinerRoute from './components/MinerRoute';

// Public Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/Auth/Login';
import RegisterPage from './pages/Auth/Register';
import ForgotPasswordPage from './pages/Auth/ForgotPassword';
import ResetPasswordPage from './pages/Auth/ResetPassword';

// Main Pages
import Dashboard from './pages/Dashboard/Dashboard';
import BlockchainExplorer from './pages/BlockchainExplorer/BlockchainExplorer';
import WalletManagement from './pages/WalletManagement/WalletManagement';
import TransactionManagement from './pages/TransactionManagement/TransactionManagement';
import SmartContractInterface from './pages/SmartContractInterface/SmartContractInterface';
import SecuritySettings from './pages/SecuritySettings/SecuritySettings';

// Admin Pages
import AdminPanel from './pages/AdminPanel/AdminPanel';

function App() {
  const { isAuthenticated, loading, user } = useAuth();

  return (
    <div className="app">      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
          <Route path="register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="blockchain" element={<BlockchainExplorer />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading} />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="wallet" element={<WalletManagement />} />
            <Route path="transactions" element={<TransactionManagement />} />
            <Route path="contracts" element={<SmartContractInterface />} />
            <Route path="security" element={<SecuritySettings />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<AdminRoute isAuthenticated={isAuthenticated} loading={loading} user={user} />}>
            <Route path="admin" element={<AdminPanel />} />
          </Route>
        </Route>
        
        {/* 404 Route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
