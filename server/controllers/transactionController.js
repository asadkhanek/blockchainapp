const express = require('express');
const { validationResult, check } = require('express-validator');
const { Blockchain } = require('../blockchain/blockchain');
const Transaction = require('../blockchain/transaction');
const Wallet = require('../blockchain/wallet');
const User = require('../models/User');

// Get blockchain, wallet, and transaction services
const blockchain = new Blockchain();

/**
 * Get all transactions for the current user
 */
exports.getTransactions = async (req, res) => {
  try {
    const { filter = 'all', sortBy = 'timestamp', sortOrder = 'desc' } = req.query;
    const userId = req.user.id;
    
    // Get user's wallet addresses
    const user = await User.findById(userId).select('wallets').populate('wallets');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Extract wallet addresses
    const userAddresses = user.wallets.map(wallet => wallet.address);
    
    // Get transactions from blockchain that match user's addresses
    let transactions = await blockchain.getTransactionsByAddresses(userAddresses);
    
    // Apply filters
    if (filter !== 'all') {
      if (filter === 'sent') {
        transactions = transactions.filter(tx => userAddresses.includes(tx.from));
      } else if (filter === 'received') {
        transactions = transactions.filter(tx => userAddresses.includes(tx.to) && !userAddresses.includes(tx.from));
      } else if (filter === 'pending') {
        transactions = transactions.filter(tx => tx.status === 'pending');
      } else if (filter === 'mining') {
        transactions = transactions.filter(tx => tx.type === 'mining');
      } else if (filter === 'contract') {
        transactions = transactions.filter(tx => tx.type === 'contract');
      }
    }
    
    // Apply sorting
    transactions.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a[sortBy] > b[sortBy] ? 1 : -1;
      } else {
        return a[sortBy] < b[sortBy] ? 1 : -1;
      }
    });
    
    res.json(transactions);
  } catch (err) {
    console.error('Error in getTransactions:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Get transaction by ID
 */
exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await blockchain.getTransactionById(id);
    
    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (err) {
    console.error('Error in getTransactionById:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Create a new transaction
 */
exports.createTransaction = [
  // Validation
  [
    check('recipientAddress', 'Recipient address is required').not().isEmpty(),
    check('amount', 'Amount is required').isNumeric(),
    check('fee', 'Fee is required').isNumeric()
  ],
  async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { recipientAddress, amount, fee, memo = '' } = req.body;
      const userId = req.user.id;
      
      // Get user's primary wallet
      const user = await User.findById(userId).select('primaryWallet').populate('primaryWallet');
      
      if (!user || !user.primaryWallet) {
        return res.status(400).json({ msg: 'No wallet found' });
      }
      
      const wallet = new Wallet();
      wallet.fromJSON(user.primaryWallet);
      
      // Check if wallet has enough balance
      const balance = await blockchain.getBalanceForAddress(wallet.publicKey);
      const totalAmount = parseFloat(amount) + parseFloat(fee);
      
      if (balance < totalAmount) {
        return res.status(400).json({ msg: 'Insufficient funds' });
      }
      
      // Create and sign transaction
      const transaction = wallet.createTransaction(
        recipientAddress,
        parseFloat(amount),
        parseFloat(fee),
        blockchain,
        memo
      );
      
      // Add transaction to pending transactions
      await blockchain.addTransaction(transaction);
      
      // Return transaction data
      res.json(transaction);
    } catch (err) {
      console.error('Error in createTransaction:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  }
];

/**
 * Calculate transaction fee
 */
exports.calculateFee = async (req, res) => {
  try {
    const { amount, customFee } = req.query;
    
    if (!amount) {
      return res.status(400).json({ msg: 'Amount is required' });
    }
    
    let fee;
    if (customFee) {
      // Use custom fee but ensure it's at least the minimum
      const minFee = blockchain.calculateMinimumFee(parseFloat(amount));
      fee = Math.max(parseFloat(customFee), minFee);
    } else {
      // Calculate recommended fee
      fee = blockchain.calculateRecommendedFee(parseFloat(amount));
    }
    
    res.json({ fee });
  } catch (err) {
    console.error('Error in calculateFee:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Cancel a pending transaction
 */
exports.cancelTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Get user's wallet addresses
    const user = await User.findById(userId).select('wallets').populate('wallets');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Extract wallet addresses
    const userAddresses = user.wallets.map(wallet => wallet.address);
    
    // Check if transaction exists and belongs to user
    const transaction = await blockchain.getTransactionById(id);
    
    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    
    // Check if transaction is from user's address
    if (!userAddresses.includes(transaction.from)) {
      return res.status(403).json({ msg: 'Not authorized to cancel this transaction' });
    }
    
    // Check if transaction is still pending
    if (transaction.status !== 'pending') {
      return res.status(400).json({ msg: 'Only pending transactions can be cancelled' });
    }
    
    // Remove transaction from pending transactions
    const success = await blockchain.removePendingTransaction(id);
    
    if (!success) {
      return res.status(400).json({ msg: 'Failed to cancel transaction' });
    }
    
    res.json({ msg: 'Transaction cancelled successfully' });
  } catch (err) {
    console.error('Error in cancelTransaction:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};
