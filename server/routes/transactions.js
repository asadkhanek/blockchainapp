const express = require('express');
const transactionController = require('../controllers/transactionController');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET api/transactions
 * @desc    Get current user's transactions with optional filters and sorting
 * @access  Private
 */
router.get('/', auth, transactionController.getTransactions);

/**
 * @route   GET api/transactions/fee
 * @desc    Calculate transaction fee
 * @access  Private
 */
router.get('/fee', auth, transactionController.calculateFee);

/**
 * @route   GET api/transactions/:id
 * @desc    Get transaction by ID
 * @access  Public
 */
router.get('/:id', transactionController.getTransactionById);

/**
 * @route   POST api/transactions
 * @desc    Create new transaction
 * @access  Private
 */
router.post('/', auth, transactionController.createTransaction);

/**
 * @route   DELETE api/transactions/:id
 * @desc    Cancel a pending transaction
 * @access  Private
 */
router.delete('/:id', auth, transactionController.cancelTransaction);

module.exports = router;
