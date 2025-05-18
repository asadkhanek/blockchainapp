const User = require('../models/User');
const Wallet = require('../blockchain/wallet');
const { Blockchain } = require('../blockchain/blockchain');

const blockchain = new Blockchain(); // This should actually be your global blockchain instance

// @route   POST api/wallets
// @desc    Create a new wallet
// @access  Private
exports.createWallet = async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: 'Name and password are required' });
  }

  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create new wallet
    const wallet = new Wallet();
    const encryptedWallet = wallet.encrypt(password);
    
    // Add wallet to user
    const newWallet = {
      id: wallet.id,
      name,
      address: wallet.publicKey,
      encryptedData: encryptedWallet.encryptedData,
      isDefault: user.wallets.length === 0, // First wallet is default
      createdAt: new Date()
    };
    
    user.wallets.push(newWallet);
    await user.save();

    res.status(201).json({
      message: 'Wallet created successfully',
      wallet: {
        id: newWallet.id,
        name: newWallet.name,
        address: newWallet.address,
        isDefault: newWallet.isDefault,
        createdAt: newWallet.createdAt
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET api/wallets
// @desc    Get all wallets for user
// @access  Private
exports.getUserWallets = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Map wallets to return only necessary information
    const wallets = user.wallets.map(wallet => ({
      id: wallet.id,
      name: wallet.name,
      address: wallet.address,
      isDefault: wallet.isDefault,
      createdAt: wallet.createdAt
    }));

    res.status(200).json({ wallets });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET api/wallets/:id
// @desc    Get wallet by ID
// @access  Private
exports.getWalletById = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find wallet
    const wallet = user.wallets.find(w => w.id === req.params.id);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.status(200).json({
      wallet: {
        id: wallet.id,
        name: wallet.name,
        address: wallet.address,
        isDefault: wallet.isDefault,
        createdAt: wallet.createdAt
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   DELETE api/wallets/:id
// @desc    Delete wallet
// @access  Private
exports.deleteWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find wallet index
    const walletIndex = user.wallets.findIndex(w => w.id === req.params.id);

    if (walletIndex === -1) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Check if trying to delete default wallet when there are other wallets
    if (user.wallets[walletIndex].isDefault && user.wallets.length > 1) {
      // Set another wallet as default
      const newDefaultIndex = walletIndex === 0 ? 1 : 0;
      user.wallets[newDefaultIndex].isDefault = true;
    }

    // Remove wallet
    user.wallets.splice(walletIndex, 1);
    await user.save();

    res.status(200).json({ message: 'Wallet deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   PUT api/wallets/default/:id
// @desc    Set default wallet
// @access  Private
exports.setDefaultWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if wallet exists
    const walletExists = user.wallets.some(w => w.id === req.params.id);

    if (!walletExists) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Update default wallet
    user.wallets.forEach(wallet => {
      wallet.isDefault = wallet.id === req.params.id;
    });

    await user.save();

    res.status(200).json({ message: 'Default wallet updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET api/wallets/:id/balance
// @desc    Get wallet balance
// @access  Private
exports.getWalletBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find wallet
    const wallet = user.wallets.find(w => w.id === req.params.id);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Get balance
    const balance = blockchain.getBalanceOfAddress(wallet.address);

    res.status(200).json({
      address: wallet.address,
      balance
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET api/wallets/:id/transactions
// @desc    Get wallet transaction history
// @access  Private
exports.getWalletTransactions = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find wallet
    const wallet = user.wallets.find(w => w.id === req.params.id);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Get transactions
    const transactions = blockchain.getTransactionsOfAddress(wallet.address);

    res.status(200).json({
      address: wallet.address,
      transactions
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};
