const express = require('express');
const fs = require('fs');
const path = require('path');
const { validationResult, check } = require('express-validator');
const Blockchain = require('../blockchain/blockchain');
const User = require('../models/User');
const Contract = require('../models/Contract');

// Get blockchain instance
const blockchain = new Blockchain();

/**
 * Get admin dashboard data
 */
exports.getDashboard = async (req, res) => {
  try {
    // Get blockchain statistics
    const blockchainStats = await blockchain.getStatistics();
    
    // Get user statistics
    const userCount = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const minerCount = await User.countDocuments({ role: 'miner' });
    const userStats = {
      total: userCount,
      admin: adminCount,
      miner: minerCount,
      regular: userCount - adminCount - minerCount
    };
    
    // Get transaction statistics
    const transactions = await blockchain.getAllTransactions();
    const lastDayTimestamp = Date.now() - (24 * 60 * 60 * 1000);
    const transactionsLast24Hours = transactions.filter(tx => tx.timestamp >= lastDayTimestamp).length;
    
    // Get contract statistics
    const contractCount = await Contract.countDocuments();
    const activeContracts = await Contract.countDocuments({ status: 'active' });
    
    // Total value locked in system
    const totalValueLocked = await blockchain.getTotalValueLocked();
    
    // Network health
    const networkHealth = await blockchain.getNetworkHealth();
    
    res.json({
      blockchainStats,
      userStats,
      transactionStats: {
        total: transactions.length,
        last24Hours: transactionsLast24Hours
      },
      contractStats: {
        total: contractCount,
        active: activeContracts
      },
      systemStats: {
        totalValueLocked,
        networkHealth
      }
    });
  } catch (err) {
    console.error('Error in getDashboard:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Get all users with pagination and filtering
 */
exports.getUsers = async (req, res) => {
  try {
    const { 
      limit = 10, 
      page = 1, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      role = 'all',
      search = ''
    } = req.query;
    
    // Build query
    const query = {};
    
    // Add role filter
    if (role && role !== 'all') {
      query.role = role;
    }
    
    // Add search filter
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get filtered users
    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
      
    // Get total count
    const totalUsers = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalUsers / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error in getUsers:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Get all transactions with pagination and filtering
 */
exports.getTransactions = async (req, res) => {
  try {
    const { 
      limit = 10, 
      page = 1, 
      sortBy = 'timestamp', 
      sortOrder = 'desc',
      type = 'all',
      status = 'all',
      fromDate,
      toDate,
      minAmount,
      maxAmount
    } = req.query;
    
    // Get all transactions from blockchain
    let transactions = await blockchain.getAllTransactions();
    
    // Apply filters
    if (type && type !== 'all') {
      transactions = transactions.filter(tx => tx.type === type);
    }
    
    if (status && status !== 'all') {
      transactions = transactions.filter(tx => tx.status === status);
    }
    
    if (fromDate) {
      const fromTimestamp = new Date(fromDate).getTime();
      transactions = transactions.filter(tx => tx.timestamp >= fromTimestamp);
    }
    
    if (toDate) {
      const toTimestamp = new Date(toDate).getTime();
      transactions = transactions.filter(tx => tx.timestamp <= toTimestamp);
    }
    
    if (minAmount) {
      transactions = transactions.filter(tx => tx.amount >= parseFloat(minAmount));
    }
    
    if (maxAmount) {
      transactions = transactions.filter(tx => tx.amount <= parseFloat(maxAmount));
    }
    
    // Apply sorting
    transactions.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a[sortBy] > b[sortBy] ? 1 : -1;
      } else {
        return a[sortBy] < b[sortBy] ? 1 : -1;
      }
    });
    
    // Apply pagination
    const total = transactions.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedTransactions = transactions.slice(skip, skip + parseInt(limit));
    
    res.json({
      transactions: paginatedTransactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error in getTransactions:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Get network status
 */
exports.getNetworkStatus = async (req, res) => {
  try {
    // Get network status from blockchain
    const networkStatus = await blockchain.getNetworkStatus();
    
    // Get connected peers
    const peers = await blockchain.getPeers();
    
    // Get node statistics
    const nodeStats = await blockchain.getNodeStatistics();
    
    res.json({
      networkStatus,
      peers,
      nodeStats
    });
  } catch (err) {
    console.error('Error in getNetworkStatus:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Add peer to network
 */
exports.addPeer = [
  // Validation
  [
    check('peerUrl', 'Peer URL is required').not().isEmpty(),
    check('peerPort', 'Peer port is required').isNumeric()
  ],
  async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { peerUrl, peerPort } = req.body;
      
      // Format peer address
      const peerAddress = `${peerUrl}:${peerPort}`;
      
      // Add peer to network
      const result = await blockchain.addPeer(peerAddress);
      
      if (!result.success) {
        return res.status(400).json({ msg: result.message || 'Failed to add peer' });
      }
      
      res.json({
        success: true,
        peer: result.peer,
        message: 'Peer added successfully'
      });
    } catch (err) {
      console.error('Error in addPeer:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  }
];

/**
 * Remove peer from network
 */
exports.removePeer = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Remove peer from network
    const result = await blockchain.removePeer(id);
    
    if (!result.success) {
      return res.status(400).json({ msg: result.message || 'Failed to remove peer' });
    }
    
    res.json({
      success: true,
      message: 'Peer removed successfully'
    });
  } catch (err) {
    console.error('Error in removePeer:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Get system logs
 */
exports.getSystemLogs = async (req, res) => {
  try {
    const { 
      level = 'all', 
      limit = 100, 
      page = 1, 
      fromDate,
      toDate
    } = req.query;
    
    // Read log files
    const logPath = path.join(__dirname, '..', 'logs');
    let logs = [];
    
    try {
      const logFiles = fs.readdirSync(logPath).filter(file => file.endsWith('.log'));
      
      for (const file of logFiles) {
        const content = fs.readFileSync(path.join(logPath, file), 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const log = JSON.parse(line);
            logs.push(log);
          } catch (e) {
            // Skip invalid log entries
          }
        }
      }
    } catch (fsErr) {
      console.error('Error reading log files:', fsErr);
      logs = await blockchain.getInMemoryLogs();
    }
    
    // Apply filters
    if (level && level !== 'all') {
      logs = logs.filter(log => log.level === level);
    }
    
    if (fromDate) {
      const fromTimestamp = new Date(fromDate).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() >= fromTimestamp);
    }
    
    if (toDate) {
      const toTimestamp = new Date(toDate).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() <= toTimestamp);
    }
    
    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply pagination
    const total = logs.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedLogs = logs.slice(skip, skip + parseInt(limit));
    
    res.json({
      logs: paginatedLogs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error in getSystemLogs:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Create system backup
 */
exports.createBackup = async (req, res) => {
  try {
    const { includeBlocks = true, includeTransactions = true, includeWallets = true } = req.body;
    
    // Create backup
    const backupResult = await blockchain.createBackup({
      includeBlocks,
      includeTransactions,
      includeWallets
    });
    
    if (!backupResult.success) {
      return res.status(500).json({ msg: backupResult.message || 'Backup creation failed' });
    }
    
    res.json({
      success: true,
      backupFile: backupResult.backupFile,
      timestamp: backupResult.timestamp,
      message: 'Backup created successfully'
    });
  } catch (err) {
    console.error('Error in createBackup:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Restore system from backup
 */
exports.restoreFromBackup = [
  // Validation
  [
    check('backupFile', 'Backup file path is required').not().isEmpty()
  ],
  async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { backupFile } = req.body;
      
      // Validate file exists
      if (!fs.existsSync(backupFile)) {
        return res.status(404).json({ msg: 'Backup file not found' });
      }
      
      // Restore from backup
      const restoreResult = await blockchain.restoreFromBackup(backupFile);
      
      if (!restoreResult.success) {
        return res.status(500).json({ msg: restoreResult.message || 'Restore failed' });
      }
      
      res.json({
        success: true,
        message: 'System restored successfully',
        details: restoreResult.details
      });
    } catch (err) {
      console.error('Error in restoreFromBackup:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  }
];
