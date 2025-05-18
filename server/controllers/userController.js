const User = require('../models/User');
const crypto = require('crypto');
const QRCode = require('qrcode');

// @route   GET api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    // Create search query
    const searchQuery = search
      ? {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Get users with pagination
    const users = await User.find(searchQuery)
      .select('-password -emailVerificationToken -resetPasswordToken -resetPasswordExpires')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    // Count total documents
    const total = await User.countDocuments(searchQuery);

    res.status(200).json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      totalUsers: total
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -emailVerificationToken -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is requesting their own profile or is an admin
    if (req.user.userId !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   PUT api/users/:id
// @desc    Update user (admin only)
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  const { username, email, firstName, lastName, role } = req.body;

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (role) user.role = role;

    await user.save();

    res.status(200).json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   DELETE api/users/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.remove();

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   POST api/users/enable-2fa
// @desc    Enable 2FA for a user
// @access  Private
exports.enable2FA = async (req, res) => {
  const { method } = req.body;

  if (!method || !['sms', 'email', 'authenticator'].includes(method)) {
    return res.status(400).json({ error: 'Invalid 2FA method' });
  }

  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate 2FA secret
    const secret = user.generate2FASecret();

    // Update user
    user.twoFactorAuth.enabled = true;
    user.twoFactorAuth.method = method;
    user.twoFactorAuth.verified = false;

    await user.save();

    let setupData = {
      method,
      secret
    };

    // If using authenticator, generate QR code
    if (method === 'authenticator') {
      const otpauthUrl = `otpauth://totp/BlockchainApp:${user.email}?secret=${secret}&issuer=BlockchainApp`;
      const qrCode = await QRCode.toDataURL(otpauthUrl);
      setupData.qrCode = qrCode;
    }

    // If using email or SMS, send verification code (implementation would go here)
    // sendVerificationCode(user, method);

    res.status(200).json({
      message: '2FA setup initiated. Please verify.',
      setupData
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   POST api/users/disable-2fa
// @desc    Disable 2FA for a user
// @access  Private
exports.disable2FA = async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Update user
    user.twoFactorAuth.enabled = false;
    user.twoFactorAuth.verified = false;
    user.twoFactorAuth.secret = undefined;

    await user.save();

    res.status(200).json({ message: '2FA disabled successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   PUT api/users/role/:id
// @desc    Update user role (admin only)
// @access  Private/Admin
exports.updateUserRole = async (req, res) => {
  const { role } = req.body;

  if (!role || !['user', 'miner', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update role
    user.role = role;
    await user.save();

    res.status(200).json({
      message: 'User role updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
};
