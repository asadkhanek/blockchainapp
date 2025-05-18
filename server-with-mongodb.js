// Blockchain app server with MongoDB Memory Server
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize MongoDB Memory Server
let mongoServer;
let DATABASE_URL;

// Setup middleware
app.use(express.json());
app.use(cors());

// User schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  wallets: [{
    id: String,
    name: String,
    address: String,
    isDefault: Boolean,
    createdAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Wallet schema
const walletSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  privateKey: {
    type: String,
    required: true
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

// Hash password before saving
userSchema.pre('save', async function(next) {
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
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Create models
const User = mongoose.model('User', userSchema);
const Wallet = mongoose.model('Wallet', walletSchema);

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new Error();
    }
    
    req.token = token;
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// Mock blockchain data
const blockchain = {
  chain: [
    {
      index: 0,
      timestamp: Date.now(),
      transactions: [],
      hash: "genesis-hash",
      previousHash: "",
      difficulty: 4,
      nonce: 0
    }
  ],
  pendingTransactions: []
};

// Routes

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const user = new User({ username, email, password });
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Wallet routes
app.post('/api/wallets', auth, async (req, res) => {
  try {
    const { name } = req.body;
    
    // Generate new wallet address and private key (in a real app, use a proper library)
    const address = `0x${Math.random().toString(16).substring(2, 42)}`;
    const privateKey = `0x${Math.random().toString(16).substring(2, 66)}`;
    
    // Create wallet in DB
    const wallet = new Wallet({
      owner: req.user._id,
      name,
      address,
      privateKey,
      balance: 0
    });
    
    await wallet.save();
    
    // Add wallet reference to user
    req.user.wallets.push({
      id: wallet._id,
      name: wallet.name,
      address: wallet.address,
      isDefault: req.user.wallets.length === 0,
      createdAt: new Date()
    });
    
    await req.user.save();
    
    res.status(201).json({
      id: wallet._id,
      name: wallet.name,
      address: wallet.address,
      balance: wallet.balance
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/wallets', auth, async (req, res) => {
  try {
    // Get user's wallets with references
    const wallets = await Wallet.find({ owner: req.user._id });
    
    res.json(wallets.map(w => ({
      id: w._id,
      name: w.name,
      address: w.address,
      balance: w.balance
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/wallets/:id', auth, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ 
      _id: req.params.id,
      owner: req.user._id
    });
    
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    
    res.json({
      id: wallet._id,
      name: wallet.name,
      address: wallet.address,
      balance: wallet.balance
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/wallets/:id', auth, async (req, res) => {
  try {
    const { name } = req.body;
    
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      owner: req.user._id
    });
    
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    
    wallet.name = name;
    await wallet.save();
    
    // Update name in user's wallets array
    const walletIndex = req.user.wallets.findIndex(w => w.id.toString() === req.params.id);
    if (walletIndex !== -1) {
      req.user.wallets[walletIndex].name = name;
      await req.user.save();
    }
    
    res.json({
      id: wallet._id,
      name: wallet.name,
      address: wallet.address,
      balance: wallet.balance
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/wallets/:id/qrcode', auth, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      owner: req.user._id
    });
    
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    
    // In a real app, use qrcode library to generate a real QR code
    res.json({
      qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Transaction fee calculation
app.get('/api/transactions/calculate-fee', auth, (req, res) => {
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

// Blockchain routes
app.get('/api/blockchain', (req, res) => {
  res.json({ blocks: blockchain.chain });
});

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Socket.io connection for real-time updates
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Send blockchain data when a client connects
  socket.emit('blockchain_update', blockchain.chain);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Something went wrong'
  });
});

// Function to connect to MongoDB and start the server
async function startServer() {
  try {
    // Create a MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    DATABASE_URL = mongoServer.getUri();
    
    // Connect to the database
    await mongoose.connect(DATABASE_URL);
    console.log('Connected to MongoDB Memory Server at', DATABASE_URL);
    
    // Add some test data
    await createTestData();
    
    // Define PORT
    const PORT = process.env.PORT || 5000;
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Visit http://localhost:${PORT} to access the application`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}

// Create test data for the application
async function createTestData() {
  try {
    // Create test user
    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    
    await testUser.save();
    
    // Create test wallet for user
    const testWallet = new Wallet({
      owner: testUser._id,
      name: 'Test Wallet',
      address: '0x123456789abcdef0123456789abcdef012345678',
      privateKey: '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      balance: 100
    });
    
    await testWallet.save();
    
    // Add wallet to user
    testUser.wallets.push({
      id: testWallet._id,
      name: testWallet.name,
      address: testWallet.address,
      isDefault: true,
      createdAt: new Date()
    });
    
    await testUser.save();
    
    console.log('Test data created successfully.');
    console.log('Test user credentials:');
    console.log('Email: test@example.com');
    console.log('Password: password123');
  } catch (err) {
    console.error('Failed to create test data:', err);
  }
}

// Start the server
startServer();
