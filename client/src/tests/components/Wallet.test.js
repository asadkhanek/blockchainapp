import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { WalletProvider } from '../../contexts/WalletContext';
import WalletDashboard from '../../components/wallet/WalletDashboard';
import CreateWallet from '../../components/wallet/CreateWallet';
import TransactionForm from '../../components/wallet/TransactionForm';
import TransactionHistory from '../../components/wallet/TransactionHistory';

// Mock the API calls
jest.mock('../../api/wallet', () => ({
  getWallets: jest.fn().mockResolvedValue({
    success: true,
    wallets: [
      {
        id: '123',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        balance: '10.5',
        name: 'Main Wallet',
        createdAt: '2025-01-01T00:00:00.000Z'
      }
    ]
  }),
  createWallet: jest.fn().mockResolvedValue({
    success: true,
    wallet: {
      id: '456',
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      balance: '0',
      name: 'New Wallet',
      createdAt: new Date().toISOString()
    },
    privateKey: '0xprivatekeysample'
  }),
  getTransactions: jest.fn().mockResolvedValue({
    success: true,
    transactions: [
      {
        id: 'tx1',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdef1234567890abcdef1234567890abcdef12',
        amount: '1.25',
        fee: '0.001',
        status: 'confirmed',
        timestamp: '2025-04-15T10:30:00.000Z',
        blockNumber: 12345
      },
      {
        id: 'tx2',
        from: '0xabcdef1234567890abcdef1234567890abcdef12',
        to: '0x1234567890abcdef1234567890abcdef12345678',
        amount: '0.5',
        fee: '0.001',
        status: 'pending',
        timestamp: '2025-04-16T14:20:00.000Z'
      }
    ]
  }),
  sendTransaction: jest.fn().mockResolvedValue({
    success: true,
    transaction: {
      id: 'tx3',
      from: '0x1234567890abcdef1234567890abcdef12345678',
      to: '0xabcdef1234567890abcdef1234567890abcdef12',
      amount: '2.0',
      fee: '0.001',
      status: 'pending',
      timestamp: new Date().toISOString()
    }
  }),
  estimateFee: jest.fn().mockResolvedValue({
    success: true,
    estimatedFee: '0.001'
  })
}));

// Utility function to render components inside required providers
const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <WalletProvider>
          {ui}
        </WalletProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Wallet Components Tests', () => {
  beforeEach(() => {
    // Clear mocks between tests
    jest.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockReturnValue('fake-token'),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
  });
  
  describe('Wallet Dashboard Component', () => {
    it('renders wallet dashboard with wallet information', async () => {
      const { getWallets } = require('../../api/wallet');
      renderWithProviders(<WalletDashboard />);
      
      // Check if loading state is shown initially
      expect(screen.getByText(/Loading wallet data/i)).toBeInTheDocument();
      
      // Check if wallet information is displayed after loading
      await waitFor(() => {
        expect(screen.getByText(/Main Wallet/i)).toBeInTheDocument();
        expect(screen.getByText(/10.5/)).toBeInTheDocument();
        expect(screen.getByText(/0x1234/i)).toBeInTheDocument(); // Shortened address
      });
      
      // Verify API call
      expect(getWallets).toHaveBeenCalled();
    });
    
    it('displays error when wallet data cannot be loaded', async () => {
      const { getWallets } = require('../../api/wallet');
      getWallets.mockRejectedValueOnce(new Error('Failed to load wallet data'));
      
      renderWithProviders(<WalletDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Error loading wallet data/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Create Wallet Component', () => {
    it('renders create wallet form', () => {
      renderWithProviders(<CreateWallet />);
      
      expect(screen.getByText(/Create New Wallet/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Wallet Name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Wallet/i })).toBeInTheDocument();
    });
    
    it('creates a new wallet successfully', async () => {
      const { createWallet } = require('../../api/wallet');
      renderWithProviders(<CreateWallet />);
      
      // Fill out form
      fireEvent.change(screen.getByLabelText(/Wallet Name/i), {
        target: { value: 'New Wallet' }
      });
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Create Wallet/i }));
      
      // Check if API was called with correct values
      await waitFor(() => {
        expect(createWallet).toHaveBeenCalledWith({
          name: 'New Wallet'
        });
      });
      
      // Check success state
      await waitFor(() => {
        expect(screen.getByText(/Wallet created successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/0xprivatekeysample/i)).toBeInTheDocument();
      });
    });
    
    it('displays backup warning after wallet creation', async () => {
      const { createWallet } = require('../../api/wallet');
      renderWithProviders(<CreateWallet />);
      
      // Fill out form
      fireEvent.change(screen.getByLabelText(/Wallet Name/i), {
        target: { value: 'New Wallet' }
      });
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Create Wallet/i }));
      
      // Check backup warning
      await waitFor(() => {
        expect(screen.getByText(/Please store your private key safely/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Transaction Form Component', () => {
    it('renders transaction form correctly', () => {
      renderWithProviders(<TransactionForm wallet={{
        id: '123',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        balance: '10.5'
      }} />);
      
      expect(screen.getByText(/Send Transaction/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Recipient Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Send/i })).toBeInTheDocument();
    });
    
    it('validates recipient address format', async () => {
      renderWithProviders(<TransactionForm wallet={{
        id: '123',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        balance: '10.5'
      }} />);
      
      // Fill out form with invalid address
      fireEvent.change(screen.getByLabelText(/Recipient Address/i), {
        target: { value: 'invalid-address' }
      });
      fireEvent.change(screen.getByLabelText(/Amount/i), {
        target: { value: '1.0' }
      });
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Send/i }));
      
      // Check validation message
      await waitFor(() => {
        expect(screen.getByText(/Invalid recipient address/i)).toBeInTheDocument();
      });
    });
    
    it('checks for sufficient balance', async () => {
      renderWithProviders(<TransactionForm wallet={{
        id: '123',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        balance: '10.5'
      }} />);
      
      // Fill out form with amount exceeding balance
      fireEvent.change(screen.getByLabelText(/Recipient Address/i), {
        target: { value: '0xabcdef1234567890abcdef1234567890abcdef12' }
      });
      fireEvent.change(screen.getByLabelText(/Amount/i), {
        target: { value: '20.0' }
      });
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Send/i }));
      
      // Check validation message
      await waitFor(() => {
        expect(screen.getByText(/Insufficient balance/i)).toBeInTheDocument();
      });
    });
    
    it('sends transaction successfully', async () => {
      const { sendTransaction, estimateFee } = require('../../api/wallet');
      renderWithProviders(<TransactionForm wallet={{
        id: '123',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        balance: '10.5'
      }} />);
      
      // Fill out form
      fireEvent.change(screen.getByLabelText(/Recipient Address/i), {
        target: { value: '0xabcdef1234567890abcdef1234567890abcdef12' }
      });
      fireEvent.change(screen.getByLabelText(/Amount/i), {
        target: { value: '2.0' }
      });
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Send/i }));
      
      // Check if API was called with correct values
      await waitFor(() => {
        expect(sendTransaction).toHaveBeenCalledWith({
          from: '0x1234567890abcdef1234567890abcdef12345678',
          to: '0xabcdef1234567890abcdef1234567890abcdef12',
          amount: '2.0'
        });
      });
      
      // Check success message
      await waitFor(() => {
        expect(screen.getByText(/Transaction sent successfully/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Transaction History Component', () => {
    it('renders transaction history correctly', async () => {
      const { getTransactions } = require('../../api/wallet');
      renderWithProviders(<TransactionHistory walletId="123" />);
      
      // Check loading state
      expect(screen.getByText(/Loading transactions/i)).toBeInTheDocument();
      
      // Check if transactions are displayed after loading
      await waitFor(() => {
        expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
        expect(screen.getByText(/pending/i)).toBeInTheDocument();
        expect(screen.getByText(/1.25/)).toBeInTheDocument();
      });
      
      // Verify API call
      expect(getTransactions).toHaveBeenCalledWith('123');
    });
    
    it('displays empty message when no transactions exist', async () => {
      const { getTransactions } = require('../../api/wallet');
      getTransactions.mockResolvedValueOnce({
        success: true,
        transactions: []
      });
      
      renderWithProviders(<TransactionHistory walletId="456" />);
      
      await waitFor(() => {
        expect(screen.getByText(/No transactions found/i)).toBeInTheDocument();
      });
    });
  });
});
