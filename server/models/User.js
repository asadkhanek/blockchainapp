// Use mock mongoose if USE_MOCK_DB is true
const mongoose = process.env.USE_MOCK_DB === 'true' 
  ? require('../../config/mongoose-mock')
  : require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  profilePicture: {
    type: String
  },
  wallets: [{
    id: String,
    name: String,
    address: String,
    encryptedData: String,
    isDefault: Boolean,
    createdAt: Date
  }],
  role: {
    type: String,
    enum: ['user', 'miner', 'admin'],
    default: 'user'
  },
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    method: {
      type: String,
      enum: ['sms', 'email', 'authenticator'],
      default: 'email'
    },
    secret: String,
    verified: {
      type: Boolean,
      default: false
    }
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate email verification token
UserSchema.methods.generateEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(20).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

// Generate reset password token
UserSchema.methods.generateResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetPasswordExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
  
  return resetToken;
};

// Generate 2FA secret
UserSchema.methods.generate2FASecret = function() {
  const secret = crypto.randomBytes(10).toString('hex');
  this.twoFactorAuth.secret = secret;
  return secret;
};

// Add a wallet
UserSchema.methods.addWallet = function(walletData) {
  // If this is the first wallet, make it default
  const isDefault = this.wallets.length === 0;
  
  const newWallet = {
    ...walletData,
    isDefault,
    createdAt: new Date()
  };
  
  this.wallets.push(newWallet);
  return newWallet;
};

// Set default wallet
UserSchema.methods.setDefaultWallet = function(walletId) {
  this.wallets.forEach(wallet => {
    wallet.isDefault = wallet.id === walletId;
  });
};

module.exports = mongoose.model('User', UserSchema);
