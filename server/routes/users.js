const express = require('express');
const userController = require('../controllers/userController');
const { auth, admin } = require('../middleware/auth');

const router = express.Router();

// @route   GET api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', [auth, admin], userController.getAllUsers);

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, userController.getUserById);

// @route   PUT api/users/:id
// @desc    Update user (admin only)
// @access  Private/Admin
router.put('/:id', [auth, admin], userController.updateUser);

// @route   DELETE api/users/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
router.delete('/:id', [auth, admin], userController.deleteUser);

// @route   POST api/users/enable-2fa
// @desc    Enable 2FA for a user
// @access  Private
router.post('/enable-2fa', auth, userController.enable2FA);

// @route   POST api/users/disable-2fa
// @desc    Disable 2FA for a user
// @access  Private
router.post('/disable-2fa', auth, userController.disable2FA);

// @route   PUT api/users/role/:id
// @desc    Update user role (admin only)
// @access  Private/Admin
router.put('/role/:id', [auth, admin], userController.updateUserRole);

module.exports = router;
