import React, { createContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';

export const BlockchainContext = createContext();

export const BlockchainProvider = ({ children }) => {
  const [blockchainInfo, setBlockchainInfo] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Listen for blockchain updates
  useEffect(() => {
    if (!socket) return;
    
    socket.on('blockchain_update', (updatedChain) => {
      // Update blocks
      setBlocks(updatedChain);
      
      // Also update blockchain info
      fetchBlockchainInfo();
    });
    
    socket.on('transaction_added', (transaction) => {
      setPendingTransactions(prev => [transaction, ...prev]);
    });
    
    return () => {
      socket.off('blockchain_update');
      socket.off('transaction_added');
    };
  }, [socket]);

  // Fetch blockchain info
  const fetchBlockchainInfo = async () => {
    try {
      setError(null);
      
      const res = await api.get('/api/blockchain');
      
      setBlockchainInfo(res.data);
    } catch (err) {
      console.error('Error fetching blockchain info:', err);
      setError('Failed to fetch blockchain information');
    }
  };

  // Fetch blocks
  const fetchBlocks = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await api.get(`/api/blockchain/blocks?page=${page}&limit=${limit}`);
      
      setBlocks(res.data.blocks);
      
      return res.data;
    } catch (err) {
      console.error('Error fetching blocks:', err);
      setError('Failed to fetch blockchain blocks');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch block by hash
  const fetchBlockByHash = async (hash) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await api.get(`/api/blockchain/blocks/${hash}`);
      
      return res.data;
    } catch (err) {
      console.error('Error fetching block:', err);
      setError('Failed to fetch block details');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch transaction by ID
  const fetchTransaction = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await api.get(`/api/transactions/${id}`);
      
      return res.data;
    } catch (err) {
      console.error('Error fetching transaction:', err);
      setError('Failed to fetch transaction details');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending transactions
  const fetchPendingTransactions = async () => {
    try {
      setError(null);
      
      const res = await api.get('/api/transactions/pending');
      
      setPendingTransactions(res.data.transactions);
      
      return res.data.transactions;
    } catch (err) {
      console.error('Error fetching pending transactions:', err);
      setError('Failed to fetch pending transactions');
      throw err;
    }
  };

  // Fetch address info
  const fetchAddressInfo = async (address) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await api.get(`/api/blockchain/addresses/${address}`);
      
      return res.data;
    } catch (err) {
      console.error('Error fetching address info:', err);
      setError('Failed to fetch address information');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create transaction
  const createTransaction = async (transactionData) => {
    try {
      setError(null);
      
      const res = await api.post('/api/transactions', transactionData);
      
      // Update pending transactions
      fetchPendingTransactions();
      
      return res.data;
    } catch (err) {
      console.error('Error creating transaction:', err);
      setError(err.response?.data?.error || 'Failed to create transaction');
      throw err;
    }
  };

  // Mine block (for miners only)
  const mineBlock = async () => {
    try {
      setError(null);
      
      const res = await api.post('/api/blockchain/mine');
      
      return res.data;
    } catch (err) {
      console.error('Error mining block:', err);
      setError(err.response?.data?.error || 'Failed to mine block');
      throw err;
    }
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Fetch blockchain info
        await fetchBlockchainInfo();
        
        // Fetch latest blocks
        await fetchBlocks();
        
        // Fetch pending transactions
        await fetchPendingTransactions();
      } catch (err) {
        console.error('Error loading initial blockchain data:', err);
        setError('Failed to load blockchain data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  return (
    <BlockchainContext.Provider
      value={{
        blockchainInfo,
        blocks,
        pendingTransactions,
        loading,
        error,
        fetchBlockchainInfo,
        fetchBlocks,
        fetchBlockByHash,
        fetchTransaction,
        fetchAddressInfo,
        fetchPendingTransactions,
        createTransaction,
        mineBlock
      }}
    >
      {children}
    </BlockchainContext.Provider>
  );
};
