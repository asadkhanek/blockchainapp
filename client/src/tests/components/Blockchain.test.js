import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import BlockchainExplorer from '../../components/blockchain/BlockchainExplorer';
import BlockDetails from '../../components/blockchain/BlockDetails';
import TransactionDetails from '../../components/blockchain/TransactionDetails';
import NetworkStats from '../../components/blockchain/NetworkStats';

// Mock the API calls
jest.mock('../../api/blockchain', () => ({
  getBlocks: jest.fn().mockResolvedValue({
    success: true,
    blocks: [
      {
        hash: '0x123hash',
        index: 1,
        timestamp: '2025-04-15T10:00:00.000Z',
        transactions: 5,
        miner: '0x1234567890abcdef1234567890abcdef12345678',
        size: 1024
      },
      {
        hash: '0x456hash',
        index: 2,
        timestamp: '2025-04-15T10:10:00.000Z',
        transactions: 3,
        miner: '0xabcdef1234567890abcdef1234567890abcdef12',
        size: 768
      }
    ],
    totalBlocks: 2
  }),
  getBlockByHash: jest.fn().mockResolvedValue({
    success: true,
    block: {
      hash: '0x123hash',
      index: 1,
      timestamp: '2025-04-15T10:00:00.000Z',
      transactions: [
        {
          id: 'tx1',
          from: '0x1234567890abcdef1234567890abcdef12345678',
          to: '0xabcdef1234567890abcdef1234567890abcdef12',
          amount: '1.25',
          fee: '0.001',
          timestamp: '2025-04-15T09:58:00.000Z'
        },
        {
          id: 'tx2',
          from: '0xabcdef1234567890abcdef1234567890abcdef12',
          to: '0x1234567890abcdef1234567890abcdef12345678',
          amount: '0.5',
          fee: '0.001',
          timestamp: '2025-04-15T09:59:00.000Z'
        }
      ],
      miner: '0x1234567890abcdef1234567890abcdef12345678',
      difficulty: 3,
      nonce: 12345,
      previousHash: '0x000hash',
      merkleRoot: '0xmerkle123',
      size: 1024
    }
  }),
  getTransactionById: jest.fn().mockResolvedValue({
    success: true,
    transaction: {
      id: 'tx1',
      from: '0x1234567890abcdef1234567890abcdef12345678',
      to: '0xabcdef1234567890abcdef1234567890abcdef12',
      amount: '1.25',
      fee: '0.001',
      blockHash: '0x123hash',
      blockIndex: 1,
      timestamp: '2025-04-15T09:58:00.000Z',
      confirmations: 10,
      status: 'confirmed'
    }
  }),
  getNetworkStats: jest.fn().mockResolvedValue({
    success: true,
    stats: {
      blockHeight: 1000,
      difficulty: 5,
      hashRate: '10 GH/s',
      activeNodes: 12,
      pendingTransactions: 8,
      lastBlockTime: '2025-04-17T09:00:00.000Z',
      averageBlockTime: 60, // seconds
      totalTransactions: 5280,
      averageTransactionFee: '0.0012'
    }
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

describe('Blockchain Components Tests', () => {
  beforeEach(() => {
    // Clear mocks between tests
    jest.clearAllMocks();
  });
  
  describe('Blockchain Explorer Component', () => {
    it('renders the blockchain explorer with blocks', async () => {
      const { getBlocks } = require('../../api/blockchain');
      renderWithProviders(<BlockchainExplorer />);
      
      // Check loading state
      expect(screen.getByText(/Loading blockchain data/i)).toBeInTheDocument();
      
      // Check if blocks are displayed after loading
      await waitFor(() => {
        expect(screen.getByText(/Block #1/i)).toBeInTheDocument();
        expect(screen.getByText(/Block #2/i)).toBeInTheDocument();
      });
      
      // Check block details
      expect(screen.getByText(/0x123hash/i)).toBeInTheDocument();
      expect(screen.getByText(/5 transactions/i)).toBeInTheDocument();
      
      // Verify API call
      expect(getBlocks).toHaveBeenCalled();
    });
  });
  
  describe('Block Details Component', () => {
    it('renders detailed block information', async () => {
      const { getBlockByHash } = require('../../api/blockchain');
      renderWithProviders(<BlockDetails blockHash="0x123hash" />);
      
      // Check loading state
      expect(screen.getByText(/Loading block details/i)).toBeInTheDocument();
      
      // Check if block details are displayed after loading
      await waitFor(() => {
        expect(screen.getByText(/Block #1/i)).toBeInTheDocument();
        expect(screen.getByText(/Miner:/i)).toBeInTheDocument();
        expect(screen.getByText(/0x123hash/i)).toBeInTheDocument();
        expect(screen.getByText(/Previous Hash:/i)).toBeInTheDocument();
        expect(screen.getByText(/0x000hash/i)).toBeInTheDocument();
      });
      
      // Check transaction list
      expect(screen.getByText(/2 Transactions/i)).toBeInTheDocument();
      expect(screen.getByText(/1.25/i)).toBeInTheDocument();
      expect(screen.getByText(/0.5/i)).toBeInTheDocument();
      
      // Verify API call
      expect(getBlockByHash).toHaveBeenCalledWith('0x123hash');
    });
    
    it('displays error when block is not found', async () => {
      const { getBlockByHash } = require('../../api/blockchain');
      getBlockByHash.mockRejectedValueOnce(new Error('Block not found'));
      
      renderWithProviders(<BlockDetails blockHash="0xinvalidhash" />);
      
      await waitFor(() => {
        expect(screen.getByText(/Error loading block details/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Transaction Details Component', () => {
    it('renders detailed transaction information', async () => {
      const { getTransactionById } = require('../../api/blockchain');
      renderWithProviders(<TransactionDetails transactionId="tx1" />);
      
      // Check loading state
      expect(screen.getByText(/Loading transaction details/i)).toBeInTheDocument();
      
      // Check if transaction details are displayed after loading
      await waitFor(() => {
        expect(screen.getByText(/Transaction ID:/i)).toBeInTheDocument();
        expect(screen.getByText(/tx1/i)).toBeInTheDocument();
        expect(screen.getByText(/From:/i)).toBeInTheDocument();
        expect(screen.getByText(/0x1234567890abcdef/i)).toBeInTheDocument(); // Shortened address
        expect(screen.getByText(/To:/i)).toBeInTheDocument();
        expect(screen.getByText(/0xabcdef1234567890/i)).toBeInTheDocument(); // Shortened address
        expect(screen.getByText(/Amount:/i)).toBeInTheDocument();
        expect(screen.getByText(/1.25/i)).toBeInTheDocument();
      });
      
      // Check confirmation details
      expect(screen.getByText(/Confirmations: 10/i)).toBeInTheDocument();
      expect(screen.getByText(/Status: confirmed/i)).toBeInTheDocument();
      
      // Verify API call
      expect(getTransactionById).toHaveBeenCalledWith('tx1');
    });
  });
  
  describe('Network Stats Component', () => {
    it('renders blockchain network statistics', async () => {
      const { getNetworkStats } = require('../../api/blockchain');
      renderWithProviders(<NetworkStats />);
      
      // Check loading state
      expect(screen.getByText(/Loading network statistics/i)).toBeInTheDocument();
      
      // Check if network stats are displayed after loading
      await waitFor(() => {
        expect(screen.getByText(/Block Height/i)).toBeInTheDocument();
        expect(screen.getByText(/1000/i)).toBeInTheDocument();
        expect(screen.getByText(/Hash Rate/i)).toBeInTheDocument();
        expect(screen.getByText(/10 GH\/s/i)).toBeInTheDocument();
        expect(screen.getByText(/Active Nodes/i)).toBeInTheDocument();
        expect(screen.getByText(/12/i)).toBeInTheDocument();
      });
      
      // Check transaction stats
      expect(screen.getByText(/Pending Transactions/i)).toBeInTheDocument();
      expect(screen.getByText(/8/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Transactions/i)).toBeInTheDocument();
      expect(screen.getByText(/5280/i)).toBeInTheDocument();
      
      // Verify API call
      expect(getNetworkStats).toHaveBeenCalled();
    });
  });
});
