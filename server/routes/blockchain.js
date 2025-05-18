const express = require('express');
const blockchainController = require('../controllers/blockchainController');
const { auth, miner } = require('../middleware/auth');

const router = express.Router();

// @route   GET api/blockchain
// @desc    Get blockchain information
// @access  Public
router.get('/', blockchainController.getBlockchainInfo);

// @route   GET api/blockchain/blocks
// @desc    Get all blocks
// @access  Public
router.get('/blocks', blockchainController.getAllBlocks);

// @route   GET api/blockchain/blocks/:hash
// @desc    Get block by hash
// @access  Public
router.get('/blocks/:hash', blockchainController.getBlockByHash);

// @route   GET api/blockchain/blocks/height/:height
// @desc    Get block by height
// @access  Public
router.get('/blocks/height/:height', blockchainController.getBlockByHeight);

// @route   GET api/blockchain/addresses/:address
// @desc    Get address information
// @access  Public
router.get('/addresses/:address', blockchainController.getAddressInfo);

// @route   GET api/blockchain/validate
// @desc    Validate blockchain
// @access  Public
router.get('/validate', blockchainController.validateChain);

// @route   POST api/blockchain/mine
// @desc    Mine a new block (miner only)
// @access  Private/Miner
router.post('/mine', [auth, miner], blockchainController.mineBlock);

// @route   GET api/blockchain/difficulty
// @desc    Get current mining difficulty
// @access  Public
router.get('/difficulty', blockchainController.getDifficulty);

// @route   GET api/blockchain/stats
// @desc    Get blockchain statistics
// @access  Public
router.get('/stats', blockchainController.getBlockchainStats);

module.exports = router;
