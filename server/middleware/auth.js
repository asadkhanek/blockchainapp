const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate user with JWT
exports.auth = async (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user ID to request
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Middleware to check if user is admin
exports.admin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Middleware to check if user is miner or admin
exports.miner = (req, res, next) => {
  if (req.user.role !== 'miner' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Miner privileges required.' });
  }
  next();
};

// Rate limiter middleware to prevent brute force attacks
exports.loginRateLimit = (req, res, next) => {
  // This is a placeholder for an actual rate limiter
  // In a real implementation, you would use a library like express-rate-limit
  // or implement a custom rate limiter with Redis
  next();
};

// Sanitize user input middleware
exports.sanitizeInput = (req, res, next) => {
  // This is a placeholder for input sanitization
  // In a real implementation, you would use a library like express-validator
  // or sanitize-html to prevent XSS attacks
  next();
};

// Middleware to validate user exists
exports.validateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};
