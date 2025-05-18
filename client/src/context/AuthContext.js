import React, { createContext, useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setLoading(false);
          return;
        }

        // Check if token is expired
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        if (decoded.exp < currentTime) {
          // Token is expired
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          return;
        }

        // Set token in axios headers
        api.defaults.headers.common['x-auth-token'] = token;
        
        // Get user data
        const res = await api.get('/api/auth/me');
        
        setUser(res.data.user);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Auth error:', err.response?.data?.error || err.message);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login user
  const login = async (email, password) => {
    try {
      setError(null);
      
      const res = await api.post('/api/auth/login', { email, password });
      
      if (res.data.requireTwoFactor) {
        return {
          requireTwoFactor: true,
          twoFactorMethod: res.data.twoFactorMethod,
          tempToken: res.data.tempToken
        };
      }
      
      const { token, user } = res.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['x-auth-token'] = token;
      
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      throw err;
    }
  };

  // Verify 2FA
  const verify2FA = async (tempToken, code) => {
    try {
      setError(null);
      
      const res = await api.post('/api/auth/verify-2fa', { tempToken, code });
      
      const { token, user } = res.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['x-auth-token'] = token;
      
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
      throw err;
    }
  };

  // Register user
  const register = async (userData) => {
    try {
      setError(null);
      
      const res = await api.post('/api/auth/register', userData);
      
      return { success: true, message: res.data.message };
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      throw err;
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['x-auth-token'];
    setIsAuthenticated(false);
    setUser(null);
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setError(null);
      
      const res = await api.put('/api/auth/update-profile', userData);
      
      setUser(res.data.user);
      
      return { success: true, message: res.data.message };
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
      throw err;
    }
  };

  // Change password
  const changePassword = async (passwordData) => {
    try {
      setError(null);
      
      const res = await api.put('/api/auth/change-password', passwordData);
      
      return { success: true, message: res.data.message };
    } catch (err) {
      setError(err.response?.data?.error || 'Password change failed');
      throw err;
    }
  };

  // Request password reset
  const forgotPassword = async (email) => {
    try {
      setError(null);
      
      const res = await api.post('/api/auth/forgot-password', { email });
      
      return { success: true, message: res.data.message };
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset request failed');
      throw err;
    }
  };

  // Reset password
  const resetPassword = async (token, password) => {
    try {
      setError(null);
      
      const res = await api.post('/api/auth/reset-password', { token, password });
      
      return { success: true, message: res.data.message };
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        error,
        login,
        verify2FA,
        register,
        logout,
        updateProfile,
        changePassword,
        forgotPassword,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
