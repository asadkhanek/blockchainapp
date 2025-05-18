const { Blockchain } = require('../blockchain/blockchain');
const User = require('../models/User');

// This should be your global blockchain instance
const blockchain = new Blockchain();

// @route   GET api/blockchain
// @desc    Get blockchain information
// @access  Public
exports.getBlockchainInfo = (req, res) => {
  try {
    const info = {
      length: blockchain.chain.length,
      difficulty: blockchain.difficulty,
      latestBlock: blockchain.getLatestBlock(),
      pendingTransactions: blockchain.pendingTransactions.length,
      miningReward: blockchain.miningReward
    };

    res.status(200).json(info);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET api/blockchain/blocks
// @desc    Get all blocks
// @access  Public
exports.getAllBlocks = (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Get blocks with pagination (reversed to show newest first)
    const reversedChain = [...blockchain.chain].reverse();
    const blocks = reversedChain.slice(skip, skip + parseInt(limit));
    
    res.status(200).json({
      blocks,
      totalPages: Math.ceil(blockchain.chain.length / limit),
      currentPage: Number(page),
      totalBlocks: blockchain.chain.length
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET api/blockchain/blocks/:hash
// @desc    Get block by hash
// @access  Public
exports.getBlockByHash = (req, res) => {
  try {
    const block = blockchain.chain.find(b => b.hash === req.params.hash);

    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    // Get block height
    const height = blockchain.chain.indexOf(block);

    res.status(200).json({
      block,
      height,
      confirmations: blockchain.chain.length - height - 1
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET api/blockchain/blocks/height/:height
// @desc    Get block by height
// @access  Public
exports.getBlockByHeight = (req, res) => {
  try {
    const height = parseInt(req.params.height);
    
    if (isNaN(height) || height < 0 || height >= blockchain.chain.length) {
      return res.status(404).json({ error: 'Invalid block height' });
    }

    const block = blockchain.chain[height];

    res.status(200).json({
      block,
      height,
      confirmations: blockchain.chain.length - height - 1
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET api/blockchain/addresses/:address
// @desc    Get address information
// @access  Public
exports.getAddressInfo = (req, res) => {
  try {
    const address = req.params.address;
    
    // Get balance
    const balance = blockchain.getBalanceOfAddress(address);
    
    // Get transactions
    const transactions = blockchain.getTransactionsOfAddress(address);
    
    // Count confirmed and unconfirmed transactions
    const confirmedTxs = transactions.filter(tx => tx.confirmations > 0).length;
    const pendingTxs = transactions.filter(tx => tx.confirmations === 0).length;
    
    // Find user associated with address (if any)
    User.findOne({ 'wallets.address': address })
      .select('username')
      .then(user => {
        res.status(200).json({
          address,
          balance,
          transactionCount: transactions.length,
          confirmedTransactions: confirmedTxs,
          pendingTransactions: pendingTxs,
          transactions,
          username: user ? user.username : 'Unknown'
        });
      })
      .catch(() => {
        // If error finding user, still return address info
        res.status(200).json({
          address,
          balance,
          transactionCount: transactions.length,
          confirmedTransactions: confirmedTxs,
          pendingTransactions: pendingTxs,
          transactions,
          username: 'Unknown'
        });
      });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET api/blockchain/validate
// @desc    Validate blockchain
// @access  Public
exports.validateChain = (req, res) => {
  try {
    const isValid = blockchain.isChainValid();
    
    res.status(200).json({
      isValid,
      message: isValid 
        ? 'Blockchain is valid' 
        : 'Blockchain validation failed'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   POST api/blockchain/mine
// @desc    Mine a new block (miner only)
// @access  Private/Miner
exports.mineBlock = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's wallet address
    const wallet = user.wallets.find(w => w.isDefault);

    if (!wallet) {
      return res.status(400).json({ error: 'No default wallet found' });
    }

    // Check if there are any pending transactions
    if (blockchain.pendingTransactions.length === 0) {
      return res.status(400).json({ error: 'No transactions to mine' });
    }

    // Mine block
    blockchain.minePendingTransactions(wallet.address);

    // Get the latest block
    const latestBlock = blockchain.getLatestBlock();

    // Update block status via socket.io
    const io = req.app.get('io');
    io.emit('blockchain_update', blockchain.chain);

    res.status(200).json({
      message: 'Block mined successfully',
      block: latestBlock,
      reward: blockchain.miningReward
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET api/blockchain/difficulty
// @desc    Get current mining difficulty
// @access  Public
exports.getDifficulty = (req, res) => {
  try {
    res.status(200).json({
      difficulty: blockchain.difficulty,
      targetHashPrefix: Array(blockchain.difficulty + 1).join('0')
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET api/blockchain/stats
// @desc    Get blockchain statistics
// @access  Public
exports.getBlockchainStats = (req, res) => {
  try {
    // Calculate total transactions
    let totalTransactions = 0;
    blockchain.chain.forEach(block => {
      totalTransactions += block.transactions.length;
    });

    // Calculate average block time
    const blockTimes = [];
    for (let i = 1; i < blockchain.chain.length; i++) {
      const currentBlock = blockchain.chain[i];
      const previousBlock = blockchain.chain[i - 1];
      const timeDiff = currentBlock.timestamp - previousBlock.timestamp;
      blockTimes.push(timeDiff);
    }

    const averageBlockTime = blockTimes.length > 0
      ? blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length
      : 0;

    // Get transaction volume (last 24 hours)
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    let recentTransactions = 0;
    let recentVolume = 0;

    blockchain.chain.forEach(block => {
      if (block.timestamp >= last24Hours) {
        block.transactions.forEach(tx => {
          recentTransactions++;
          recentVolume += tx.amount;
        });
      }
    });

    res.status(200).json({
      blockchainLength: blockchain.chain.length,
      totalTransactions,
      pendingTransactions: blockchain.pendingTransactions.length,
      averageBlockTime, // in milliseconds
      lastBlockTime: blockchain.getLatestBlock().timestamp,
      currentDifficulty: blockchain.difficulty,
      recentTransactions,
      recentVolume
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};
