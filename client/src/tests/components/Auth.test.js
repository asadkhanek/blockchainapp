import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import Login from '../../components/auth/Login';
import Register from '../../components/auth/Register';
import PasswordReset from '../../components/auth/PasswordReset';
import TwoFactorAuth from '../../components/auth/TwoFactorAuth';

// Mock the API calls
jest.mock('../../api/auth', () => ({
  login: jest.fn().mockResolvedValue({
    success: true,
    token: 'fake-token',
    user: { id: '123', username: 'testuser', email: 'test@example.com' }
  }),
  register: jest.fn().mockResolvedValue({
    success: true,
    message: 'Registration successful'
  }),
  requestPasswordReset: jest.fn().mockResolvedValue({
    success: true,
    message: 'Password reset email sent'
  }),
  resetPassword: jest.fn().mockResolvedValue({
    success: true,
    message: 'Password reset successful'
  }),
  verifyTwoFactor: jest.fn().mockResolvedValue({
    success: true,
    token: 'fake-token'
  }),
  setupTwoFactor: jest.fn().mockResolvedValue({
    success: true,
    qrCode: 'data:image/png;base64,fakeQRCode',
    secret: 'FAKESECRET'
  })
}));

// Utility function to render components inside required providers
const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Auth Components Tests', () => {
  beforeEach(() => {
    // Clear mocks between tests
    jest.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
  });
  
  describe('Login Component', () => {
    it('renders login form correctly', () => {
      renderWithProviders(<Login />);
      
      expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
    });
    
    it('submits form with valid credentials', async () => {
      const { login } = require('../../api/auth');
      renderWithProviders(<Login />);
      
      // Fill out form
      fireEvent.change(screen.getByLabelText(/Email/i), { 
        target: { value: 'test@example.com' } 
      });
      fireEvent.change(screen.getByLabelText(/Password/i), { 
        target: { value: 'password123' } 
      });
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Login/i }));
      
      // Check if API was called with correct values
      await waitFor(() => {
        expect(login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });
      
      // Check if token was saved in localStorage
      await waitFor(() => {
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
          'token', 
          'fake-token'
        );
      });
    });
    
    it('displays error message with invalid credentials', async () => {
      const { login } = require('../../api/auth');
      login.mockRejectedValueOnce({ 
        response: { 
          data: { message: 'Invalid credentials' } 
        } 
      });
      
      renderWithProviders(<Login />);
      
      // Fill out form
      fireEvent.change(screen.getByLabelText(/Email/i), { 
        target: { value: 'wrong@example.com' } 
      });
      fireEvent.change(screen.getByLabelText(/Password/i), { 
        target: { value: 'wrongpassword' } 
      });
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Login/i }));
      
      // Check if error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Register Component', () => {
    it('renders registration form correctly', () => {
      renderWithProviders(<Register />);
      
      expect(screen.getByText(/Create an Account/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
    });
    
    it('validates matching passwords', async () => {
      renderWithProviders(<Register />);
      
      // Fill out form with non-matching passwords
      fireEvent.change(screen.getByLabelText(/Username/i), {
        target: { value: 'testuser' }
      });
      fireEvent.change(screen.getByLabelText(/Email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/Password/i), {
        target: { value: 'Password123' }
      });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
        target: { value: 'DifferentPassword123' }
      });
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Register/i }));
      
      // Check if error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
      });
    });
    
    it('submits form with valid registration data', async () => {
      const { register } = require('../../api/auth');
      renderWithProviders(<Register />);
      
      // Fill out form
      fireEvent.change(screen.getByLabelText(/Username/i), {
        target: { value: 'newuser' }
      });
      fireEvent.change(screen.getByLabelText(/Email/i), {
        target: { value: 'newuser@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/Password/i), {
        target: { value: 'Password123!' }
      });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
        target: { value: 'Password123!' }
      });
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Register/i }));
      
      // Check if API was called with correct values
      await waitFor(() => {
        expect(register).toHaveBeenCalledWith({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'Password123!'
        });
      });
      
      // Check success message
      await waitFor(() => {
        expect(screen.getByText(/Registration successful/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Password Reset Component', () => {
    it('renders password reset request form', () => {
      renderWithProviders(<PasswordReset />);
      
      expect(screen.getByText(/Reset Your Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Send Reset Link/i })).toBeInTheDocument();
    });
    
    it('submits password reset request', async () => {
      const { requestPasswordReset } = require('../../api/auth');
      renderWithProviders(<PasswordReset />);
      
      // Fill out form
      fireEvent.change(screen.getByLabelText(/Email/i), {
        target: { value: 'reset@example.com' }
      });
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));
      
      // Check if API was called with correct values
      await waitFor(() => {
        expect(requestPasswordReset).toHaveBeenCalledWith('reset@example.com');
      });
      
      // Check success message
      await waitFor(() => {
        expect(screen.getByText(/Password reset email sent/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Two-Factor Authentication Component', () => {
    it('renders 2FA setup form correctly', () => {
      renderWithProviders(<TwoFactorAuth setup={true} />);
      
      expect(screen.getByText(/Two-Factor Authentication Setup/i)).toBeInTheDocument();
    });
    
    it('renders 2FA verification form correctly', () => {
      renderWithProviders(<TwoFactorAuth setup={false} />);
      
      expect(screen.getByText(/Two-Factor Authentication/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Verify/i })).toBeInTheDocument();
    });
    
    it('submits verification code', async () => {
      const { verifyTwoFactor } = require('../../api/auth');
      renderWithProviders(<TwoFactorAuth setup={false} userId="123" />);
      
      // Fill out form
      fireEvent.change(screen.getByLabelText(/Verification Code/i), {
        target: { value: '123456' }
      });
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
      
      // Check if API was called with correct values
      await waitFor(() => {
        expect(verifyTwoFactor).toHaveBeenCalledWith({
          userId: "123",
          code: '123456'
        });
      });
    });
  });
});
