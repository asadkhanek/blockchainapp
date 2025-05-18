const express = require('express');
const { validationResult, check } = require('express-validator');
const { Blockchain } = require('../blockchain/blockchain');
const Wallet = require('../blockchain/wallet');
const Contract = require('../models/Contract');
const User = require('../models/User');
const SmartContract = require('../blockchain/smartContract');

// Get blockchain instance
const blockchain = new Blockchain();

/**
 * Get all contracts
 */
exports.getAllContracts = async (req, res) => {
  try {
    const { limit = 10, page = 1, sortBy = 'deployedAt', sortOrder = 'desc', status = 'active' } = req.query;
    
    // Build query
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const contracts = await Contract.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('owner', 'username email');
      
    const totalContracts = await Contract.countDocuments(query);
    
    res.json({
      contracts,
      pagination: {
        total: totalContracts,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalContracts / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error in getAllContracts:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Get contract by ID
 */
exports.getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const contract = await Contract.findById(id).populate('owner', 'username email');
    
    if (!contract) {
      return res.status(404).json({ msg: 'Contract not found' });
    }
    
    res.json(contract);
  } catch (err) {
    console.error('Error in getContractById:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Create new contract
 */
exports.createContract = [
  // Validation
  [
    check('name', 'Name is required').not().isEmpty(),
    check('code', 'Contract code is required').not().isEmpty(),
    check('initialBalance', 'Initial balance must be a number').optional().isNumeric()
  ],
  async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { name, code, initialBalance = 0, description = '', tags = [] } = req.body;
      const userId = req.user.id;
      
      // Get user's primary wallet
      const user = await User.findById(userId).select('primaryWallet').populate('primaryWallet');
      
      if (!user || !user.primaryWallet) {
        return res.status(400).json({ msg: 'No wallet found' });
      }
      
      const wallet = new Wallet();
      wallet.fromJSON(user.primaryWallet);
      
      // Verify funds if initial balance is provided
      if (initialBalance > 0) {
        const balance = await blockchain.getBalanceForAddress(wallet.publicKey);
        
        if (balance < initialBalance) {
          return res.status(400).json({ msg: 'Insufficient funds for contract deployment' });
        }
      }
      
      // Create and deploy smart contract
      const smartContract = new SmartContract(code);
      
      // Validate contract code
      if (!smartContract.validate()) {
        return res.status(400).json({ msg: 'Invalid contract code' });
      }
      
      // Deploy contract to blockchain
      const deploymentResult = await blockchain.deployContract(
        smartContract,
        wallet,
        initialBalance
      );
      
      if (!deploymentResult.success) {
        return res.status(400).json({ msg: deploymentResult.message || 'Contract deployment failed' });
      }
      
      // Create contract record in database
      const newContract = new Contract({
        name,
        owner: userId,
        address: deploymentResult.contractAddress,
        code,
        abi: smartContract.getABI(),
        balance: initialBalance,
        txHash: deploymentResult.txHash,
        description,
        tags
      });
      
      await newContract.save();
      
      res.json(newContract);
    } catch (err) {
      console.error('Error in createContract:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  }
];

/**
 * Update contract
 */
exports.updateContract = [
  // Validation
  [
    check('name', 'Name is required').optional().not().isEmpty(),
    check('description', 'Description must be a string').optional().isString(),
    check('tags', 'Tags must be an array').optional().isArray()
  ],
  async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { id } = req.params;
      const { name, description, tags, status } = req.body;
      const userId = req.user.id;
      
      // Find contract
      const contract = await Contract.findById(id);
      
      if (!contract) {
        return res.status(404).json({ msg: 'Contract not found' });
      }
      
      // Check ownership
      if (contract.owner.toString() !== userId) {
        return res.status(403).json({ msg: 'Not authorized to update this contract' });
      }
      
      // Update fields
      if (name) contract.name = name;
      if (description) contract.description = description;
      if (tags) contract.tags = tags;
      if (status && ['active', 'paused', 'terminated'].includes(status)) {
        contract.status = status;
        
        // Update contract status on blockchain
        await blockchain.updateContractStatus(contract.address, status);
      }
      
      await contract.save();
      
      res.json(contract);
    } catch (err) {
      console.error('Error in updateContract:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  }
];

/**
 * Delete contract
 */
exports.deleteContract = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Find contract
    const contract = await Contract.findById(id);
    
    if (!contract) {
      return res.status(404).json({ msg: 'Contract not found' });
    }
    
    // Check ownership
    if (contract.owner.toString() !== userId) {
      return res.status(403).json({ msg: 'Not authorized to delete this contract' });
    }
    
    // Check if contract has balance
    if (contract.balance > 0) {
      return res.status(400).json({ msg: 'Cannot delete contract with non-zero balance' });
    }
    
    // Update blockchain
    await blockchain.terminateContract(contract.address);
    
    // Delete from database
    await Contract.findByIdAndDelete(id);
    
    res.json({ msg: 'Contract deleted successfully' });
  } catch (err) {
    console.error('Error in deleteContract:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Execute contract method
 */
exports.executeContractMethod = [
  // Validation
  [
    check('method', 'Method name is required').not().isEmpty(),
    check('args', 'Arguments must be an array').isArray()
  ],
  async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { id } = req.params;
      const { method, args, value = 0 } = req.body;
      const userId = req.user.id;
      
      // Find contract
      const contract = await Contract.findById(id);
      
      if (!contract) {
        return res.status(404).json({ msg: 'Contract not found' });
      }
      
      // Check if contract is active
      if (contract.status !== 'active') {
        return res.status(400).json({ msg: `Contract is ${contract.status}` });
      }
      
      // Get user's wallet
      const user = await User.findById(userId).select('primaryWallet').populate('primaryWallet');
      
      if (!user || !user.primaryWallet) {
        return res.status(400).json({ msg: 'No wallet found' });
      }
      
      const wallet = new Wallet();
      wallet.fromJSON(user.primaryWallet);
      
      // Check if user has enough funds for value transfer
      if (value > 0) {
        const balance = await blockchain.getBalanceForAddress(wallet.publicKey);
        
        if (balance < value) {
          return res.status(400).json({ msg: 'Insufficient funds' });
        }
      }
      
      // Execute contract method
      const result = await blockchain.executeContract(
        contract.address,
        method,
        args,
        wallet,
        value
      );
      
      if (!result.success) {
        return res.status(400).json({ msg: result.message || 'Contract execution failed' });
      }
      
      // Update contract balance if value was transferred
      if (value > 0) {
        contract.balance += value;
        await contract.save();
      }
      
      // Record execution
      contract.executedTransactions.push({
        txHash: result.txHash,
        method,
        args,
        result: result.methodResult,
        caller: userId,
        status: 'success',
        gasUsed: result.gasUsed
      });
      
      await contract.save();
      
      res.json({
        success: true,
        result: result.methodResult,
        txHash: result.txHash,
        gasUsed: result.gasUsed
      });
    } catch (err) {
      console.error('Error in executeContractMethod:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  }
];

/**
 * Get contracts by owner
 */
exports.getContractsByOwner = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'all' } = req.query;
    
    // Build query
    const query = { owner: userId };
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const contracts = await Contract.find(query).sort({ deployedAt: -1 });
    
    res.json(contracts);
  } catch (err) {
    console.error('Error in getContractsByOwner:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Transfer funds from contract
 */
exports.transferFundsFromContract = [
  // Validation
  [
    check('recipientAddress', 'Recipient address is required').not().isEmpty(),
    check('amount', 'Amount is required and must be numeric').isNumeric()
  ],
  async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { id } = req.params;
      const { recipientAddress, amount } = req.body;
      const userId = req.user.id;
      
      // Find contract
      const contract = await Contract.findById(id);
      
      if (!contract) {
        return res.status(404).json({ msg: 'Contract not found' });
      }
      
      // Check ownership
      if (contract.owner.toString() !== userId) {
        return res.status(403).json({ msg: 'Not authorized to transfer funds from this contract' });
      }
      
      // Check if contract is active
      if (contract.status !== 'active') {
        return res.status(400).json({ msg: `Contract is ${contract.status}` });
      }
      
      // Check if contract has enough balance
      if (contract.balance < amount) {
        return res.status(400).json({ msg: 'Insufficient contract balance' });
      }
      
      // Get user's wallet for authentication
      const user = await User.findById(userId).select('primaryWallet').populate('primaryWallet');
      
      if (!user || !user.primaryWallet) {
        return res.status(400).json({ msg: 'No wallet found' });
      }
      
      const wallet = new Wallet();
      wallet.fromJSON(user.primaryWallet);
      
      // Transfer funds from contract
      const result = await blockchain.transferFromContract(
        contract.address,
        recipientAddress,
        parseFloat(amount),
        wallet
      );
      
      if (!result.success) {
        return res.status(400).json({ msg: result.message || 'Transfer failed' });
      }
      
      // Update contract balance
      contract.balance -= parseFloat(amount);
      await contract.save();
      
      res.json({
        success: true,
        txHash: result.txHash,
        newBalance: contract.balance
      });
    } catch (err) {
      console.error('Error in transferFundsFromContract:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  }
];
