// MongoDB-connected blockchain server
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const qrcode = require('qrcode');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Environment variables
require('dotenv').config();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blockchain-app';
const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_key';

// In-memory fallback data
const fallbackBlockchain = {
  blocks: [
    {
      index: 0,
      timestamp: Date.now() - 1000000,
      transactions: [],
      hash: "genesis-hash-0",
      previousHash: "",
      difficulty: 4,
      nonce: 0
    },
    {
      index: 1,
      timestamp: Date.now() - 500000,
      transactions: [
        {
          id: "tx1",
          from: "system",
          to: "wallet-1",
          amount: 50,
          fee: 0,
          timestamp: Date.now() - 600000
        }
      ],
      hash: "block-hash-1",
      previousHash: "genesis-hash-0",
      difficulty: 4,
      nonce: 1234
    }
  ]
};

// Fallback data
const fallbackWallets = [
  {
    id: "wallet-1",
    name: "Main Wallet",
    address: "0x1234567890ABCDEF",
    balance: 50
  }
];

// Fallback user data
let fallbackUser = {
  id: "user-1",
  username: "demo",
  email: "demo@example.com",
  password: "$2a$10$XJKRFHhxHxCX0vfD.nzYZ.iVWP3cN2X.CJQRTih8VI97G9IN1KMgO", // hashed "password123"
  wallets: ["wallet-1"]
};

// MongoDB connection with fallback
let isMongoConnected = false;
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully!');
    isMongoConnected = true;
  })
  .catch(err => {
    console.log('MongoDB Connection Failed:', err.message);
    console.log('Using in-memory fallback data instead...');
  });

// User Schema
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  wallets: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Wallet Schema
const WalletSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Block Schema
const BlockSchema = new mongoose.Schema({
  index: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Number,
    required: true
  },
  transactions: [{
    id: String,
    from: String,
    to: String,
    amount: Number,
    fee: Number,
    timestamp: Number
  }],
  hash: {
    type: String,
    required: true
  },
  previousHash: {
    type: String,
    required: true
  },
  difficulty: {
    type: Number,
    required: true
  },
  nonce: {
    type: Number,
    required: true
  }
});

// Create models
const User = mongoose.model('User', UserSchema);
const Wallet = mongoose.model('Wallet', WalletSchema);
const Block = mongoose.model('Block', BlockSchema);

// Initialize database with fallback data if empty
async function initializeDatabase() {
  if (!isMongoConnected) return;
  
  try {
    // Check if there are any users
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      // Create demo user
      const demoUser = new User({
        username: 'demo',
        email: 'demo@example.com',
        password: hashedPassword,
        wallets: ['wallet-1']
      });
      await demoUser.save();
      
      // Create demo wallet
      const demoWallet = new Wallet({
        id: 'wallet-1',
        name: 'Main Wallet',
        address: '0x1234567890ABCDEF',
        balance: 50
      });
      await demoWallet.save();
      
      // Create genesis block
      const genesisBlock = new Block(fallbackBlockchain.blocks[0]);
      await genesisBlock.save();
      
      // Create second block
      const secondBlock = new Block(fallbackBlockchain.blocks[1]);
      await secondBlock.save();
      
      console.log('Database initialized with demo data');
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Initialize database after connection
setTimeout(initializeDatabase, 2000);

// Middleware
app.use(express.json());
app.use(cors());

// Authentication middleware
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  try {
    if (token === 'demo-token' && !isMongoConnected) {
      // Fallback for demo when MongoDB is not connected
      req.user = fallbackUser;
      return next();
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (isMongoConnected) {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      req.user = user;
    } else {
      req.user = fallbackUser;
    }
    
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }
  
  try {
    if (isMongoConnected) {
      // Try to find user in MongoDB
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } else {
      // Fallback to demo user when MongoDB is not connected
      if (email === 'demo@example.com' && password === 'password123') {
        res.json({
          token: 'demo-token',
          user: {
            id: fallbackUser.id,
            username: fallbackUser.username,
            email: fallbackUser.email
          }
        });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }
  
  try {
    if (isMongoConnected) {
      // Check if user exists
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create new user
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        wallets: []
      });
      
      await newUser.save();
      
      const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '1d' });
      
      res.status(201).json({
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email
        }
      });
    } else {
      // Fallback response when MongoDB is not connected
      res.status(201).json({
        token: 'demo-token',
        user: {
          id: 'user-' + Date.now(),
          username,
          email
        }
      });
    }
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Wallet routes
app.get('/api/wallets', authenticate, async (req, res) => {
  try {
    if (isMongoConnected) {
      const walletIds = req.user.wallets || [];
      const wallets = await Wallet.find({ id: { $in: walletIds } });
      res.json(wallets);
    } else {
      // Fallback response
      res.json(fallbackWallets);
    }
  } catch (err) {
    console.error('Get wallets error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/wallets/:id', authenticate, async (req, res) => {
  try {
    if (isMongoConnected) {
      const wallet = await Wallet.findOne({ id: req.params.id });
      
      if (!wallet || !req.user.wallets.includes(wallet.id)) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
      
      res.json(wallet);
    } else {
      // Fallback response
      const wallet = fallbackWallets.find(w => w.id === req.params.id);
      
      if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
      
      res.json(wallet);
    }
  } catch (err) {
    console.error('Get wallet error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/wallets', authenticate, async (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Please provide a wallet name' });
  }
  
  try {
    const walletId = `wallet-${Date.now()}`;
    const walletAddress = '0x' + Math.random().toString(16).substring(2, 10).toUpperCase();
    
    if (isMongoConnected) {
      // Create new wallet in MongoDB
      const newWallet = new Wallet({
        id: walletId,
        name,
        address: walletAddress,
        balance: 0
      });
      
      await newWallet.save();
      
      // Add wallet id to user's wallets
      await User.findByIdAndUpdate(req.user.id, {
        $push: { wallets: walletId }
      });
      
      res.status(201).json(newWallet);
    } else {
      // Fallback response
      const newWallet = {
        id: walletId,
        name,
        address: walletAddress,
        balance: 0
      };
      
      fallbackWallets.push(newWallet);
      fallbackUser.wallets.push(walletId);
      
      res.status(201).json(newWallet);
    }
  } catch (err) {
    console.error('Create wallet error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/wallets/:id/qrcode', authenticate, async (req, res) => {
  try {
    let wallet;
    
    if (isMongoConnected) {
      wallet = await Wallet.findOne({ id: req.params.id });
      
      if (!wallet || !req.user.wallets.includes(wallet.id)) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
    } else {
      wallet = fallbackWallets.find(w => w.id === req.params.id);
      
      if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
    }
    
    // Generate QR code
    try {
      const qrData = `blockchain:${wallet.address}`;
      const qrCodeDataUrl = await qrcode.toDataURL(qrData);
      res.json({ qrCode: qrCodeDataUrl });
    } catch (qrErr) {
      // Fallback QR code if generation fails
      res.json({ 
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAACECAYAAABRRIOnAAAAAklEQVR4AewaftIAAAOPSURBVO3BQY4cSRLAQDLQ//8yV0c/JZCoain6cTAz/2GtcSxrjWNZaxzLWuNY1hrHstY4lrXGsaw1jmWtcSxrjWNZaxzLWuNY1hrHsta4ePBJld+kcinlN1V+UuUTy1rjWNYax7LWuPiiyjeVnlC6ULpQulC6ULpQulC6UOmJ0jdVvmlZaxzLWuNY1hoXD35Y5YnSTyldKF0ofULpidITlZ9UeWJZaxzLWuNY1hoXD9YvlP5NLGuNY1lrHMta4+LBh1V+k9KF0oXShdKF0m9SeaL0TctaazuWtcaxrDUuHvxlSk8o/ZdVnlD6S5a1xrGsNY5lrXHx4EMqf5nSE0pPKP3Syv9jWWscy1rjWNYaFw9+WOUvU7pQeqJ0oXSh9ITSv2lZaxzLWuNY1hoXDz6p8k1KF0pPKH1C6UKlC6UnlC6UnlC6ULpQ+qZlrXEsa41jWWtcPPiXKT2h9AmV/7LKNy1rjWNZaxzLWuPiwTqWtcaxrDWOZa1x8eCDKhdKFyoXSk+oXChdKF0oXShdKF0oXShdKF0oXaF0ofJNy1rjWNYax7LWuHjwSSoXSk8oXShdKF0oXShdKF0oXSg9ofJE5ULpCZVvWtYax7LWOJa1xsUD/mGVJ5S+qXSh9IllfWJZaxzLWuPiwR9WuVC6ULpQulC6ULpQeqJ0ofSE0oXShcqFyk8sa41jWWscy1rj4sGHVJ5QeqL0hNITpQulJ5SeKF0o/STlE8ta41jWGsey1rh48CGlb1K6UHpC6ULpCaULpSdKTyg9ofRNy1rjWNYax7LWmH/4JqULpQulC6ULpQuVC6ULpSdKTyhdKF0oXShdKF0ofWJZaxzLWuNY1hoXD35Y5ScpXSg9oXShdKF0ofSE0oXSE0oXSk8oXSj9pGWtcSxrjWNZa1w8+GWlC6UnlC5UulC6ULpQulC6ULpQulB6ovRE6S9Z1hrHstY4lrXGxYOfVLpQulC6ULpQulD6hNITpQulC5UnlC6UnlC6ULpQulD6xLLWOJa1xrGsNS4e/LDKE0oXShdKF0rfVLpQekLpN5WeUPqmZa1xLGuNY1lrzH/4H1O6ULpQulC6ULpQulB6onSh9ITShcrFsn6yrDWOZa1xLGuNiwd8UOUTSt+kdKF0ofSE0oXShdIT/6ZlrXEsa41jWWscy1rjWNYax7LWOJa1xrGsNY5lrXEsa41jWWscy1rjWNYax7LWOJa1xrGsNf4DSQ+EbrftXpIAAAAASUVORK5CYII='
      });
    }
  } catch (err) {
    console.error('QR code error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Blockchain routes
app.get('/api/blockchain', async (req, res) => {
  try {
    if (isMongoConnected) {
      const blocks = await Block.find().sort({ index: 1 });
      res.json({ blocks });
    } else {
      // Fallback response
      res.json(fallbackBlockchain);
    }
  } catch (err) {
    console.error('Blockchain error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Transaction fee calculator
app.get('/api/transactions/calculate-fee', (req, res) => {
  const amount = parseFloat(req.query.amount) || 0;
  const customFee = parseFloat(req.query.customFee) || null;
  
  let fee;
  if (customFee !== null) {
    fee = Math.max(customFee, 0.01);
  } else if (amount < 1) {
    fee = 0.01;
  } else {
    fee = amount * 0.02;
  }
  
  res.json({ fee });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    server: 'running',
    mongodb: isMongoConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Serve static files
const staticPath = path.join(__dirname, 'client/build');
app.use(express.static(staticPath));

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send initial blockchain data
  if (isMongoConnected) {
    Block.find().sort({ index: 1 })
      .then(blocks => socket.emit('blockchain_update', { blocks }))
      .catch(err => console.error('Socket blockchain error:', err));
  } else {
    socket.emit('blockchain_update', fallbackBlockchain);
  }
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════╗
  ║                                            ║
  ║   Blockchain App Server Running!           ║
  ║                                            ║
  ║   - API running on http://localhost:${PORT}    ║
  ║   - MongoDB ${isMongoConnected ? 'Connected' : 'Disconnected'}            ║
  ║                                            ║
  ║   Test credentials:                        ║
  ║     Email: demo@example.com                ║
  ║     Password: password123                  ║
  ║                                            ║
  ╚════════════════════════════════════════════╝
  `);
});
