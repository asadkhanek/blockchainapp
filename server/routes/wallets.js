const express = require('express');
const walletController = require('../controllers/walletController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST api/wallets
// @desc    Create a new wallet
// @access  Private
router.post('/', auth, walletController.createWallet);

// @route   GET api/wallets
// @desc    Get all wallets for user
// @access  Private
router.get('/', auth, walletController.getUserWallets);

// @route   GET api/wallets/:id
// @desc    Get wallet by ID
// @access  Private
router.get('/:id', auth, walletController.getWalletById);

// @route   DELETE api/wallets/:id
// @desc    Delete wallet
// @access  Private
router.delete('/:id', auth, walletController.deleteWallet);

// @route   PUT api/wallets/default/:id
// @desc    Set default wallet
// @access  Private
router.put('/default/:id', auth, walletController.setDefaultWallet);

// @route   GET api/wallets/:id/balance
// @desc    Get wallet balance
// @access  Private
router.get('/:id/balance', auth, walletController.getWalletBalance);

// @route   GET api/wallets/:id/transactions
// @desc    Get wallet transaction history
// @access  Private
router.get('/:id/transactions', auth, walletController.getWalletTransactions);

module.exports = router;
