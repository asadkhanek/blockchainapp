const express = require('express');
const contractController = require('../controllers/contractController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET api/contracts
// @desc    Get all contracts
// @access  Public
router.get('/', contractController.getAllContracts);

// @route   GET api/contracts/:id
// @desc    Get contract by ID
// @access  Public
router.get('/:id', contractController.getContractById);

// @route   POST api/contracts
// @desc    Create new contract
// @access  Private
router.post('/', auth, contractController.createContract);

// @route   PUT api/contracts/:id
// @desc    Update contract
// @access  Private
router.put('/:id', auth, contractController.updateContract);

// @route   DELETE api/contracts/:id
// @desc    Delete contract
// @access  Private
router.delete('/:id', auth, contractController.deleteContract);

// @route   POST api/contracts/:id/execute
// @desc    Execute contract method
// @access  Private
router.post('/:id/execute', auth, contractController.executeContractMethod);

// @route   GET api/contracts/owner
// @desc    Get contracts by owner
// @access  Private
router.get('/owner', auth, contractController.getContractsByOwner);

// @route   POST api/contracts/:id/transfer
// @desc    Transfer funds from contract to address
// @access  Private
router.post('/:id/transfer', auth, contractController.transferFundsFromContract);

module.exports = router;
