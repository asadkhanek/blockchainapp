const express = require('express');
const adminController = require('../controllers/adminController');
const { auth, admin } = require('../middleware/auth');

const router = express.Router();

// @route   GET api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private/Admin
router.get('/dashboard', [auth, admin], adminController.getDashboard);

// @route   GET api/admin/users
// @desc    Get all users with pagination and filtering
// @access  Private/Admin
router.get('/users', [auth, admin], adminController.getUsers);

// @route   GET api/admin/transactions
// @desc    Get all transactions with pagination and filtering
// @access  Private/Admin
router.get('/transactions', [auth, admin], adminController.getTransactions);

// @route   GET api/admin/network
// @desc    Get network status
// @access  Private/Admin
router.get('/network', [auth, admin], adminController.getNetworkStatus);

// @route   POST api/admin/network/peers
// @desc    Add peer to network
// @access  Private/Admin
router.post('/network/peers', [auth, admin], adminController.addPeer);

// @route   DELETE api/admin/network/peers/:id
// @desc    Remove peer from network
// @access  Private/Admin
router.delete('/network/peers/:id', [auth, admin], adminController.removePeer);

// @route   GET api/admin/logs
// @desc    Get system logs
// @access  Private/Admin
router.get('/logs', [auth, admin], adminController.getSystemLogs);

// @route   POST api/admin/system/backup
// @desc    Create system backup
// @access  Private/Admin
router.post('/system/backup', [auth, admin], adminController.createBackup);

// @route   POST api/admin/system/restore
// @desc    Restore system from backup
// @access  Private/Admin
router.post('/system/restore', [auth, admin], adminController.restoreFromBackup);

module.exports = router;
