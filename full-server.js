// Enhanced Blockchain App with in-memory MongoDB
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
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

// MongoDB Setup
async function setupMongoMemoryServer() {
  console.log('Setting up MongoDB Memory Server...');
  
  // Create an in-memory MongoDB instance
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  console.log(`MongoDB Memory Server URI: ${mongoUri}`);
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  
  console.log('Connected to in-memory MongoDB!');
  return mongoServer;
}

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
    id: String,
    name: String,
    address: String,
    balance: Number,
    createdAt: Date
  }],
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

// Create User model
const User = mongoose.model('User', UserSchema);

// Blockchain model
const BlockSchema = new mongoose.Schema({
  index: Number,
  timestamp: Number,
  transactions: Array,
  hash: String,
  previousHash: String,
  difficulty: Number,
  nonce: Number
});

const Block = mongoose.model('Block', BlockSchema);

// Wallet model
const WalletSchema = new mongoose.Schema({
  name: String,
  address: String,
  balance: Number,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Wallet = mongoose.model('Wallet', WalletSchema);

// Middleware
app.use(express.json());
app.use(cors());

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }
    
    const decoded = jwt.verify(token, 'blockchain-app-secret-key');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid authentication token' });
  }
};

// Create Genesis Block
async function createGenesisBlock() {
  const existingBlock = await Block.findOne({ index: 0 });
  if (!existingBlock) {
    const genesisBlock = new Block({
      index: 0,
      timestamp: Date.now(),
      transactions: [],
      hash: "genesis-hash-" + Date.now(),
      previousHash: "",
      difficulty: 4,
      nonce: 0
    });
    
    await genesisBlock.save();
    console.log('Genesis block created');
  } else {
    console.log('Genesis block already exists');
  }
}

// Create a demo user
async function createDemoUser() {
  try {
    const existingUser = await User.findOne({ username: 'demo' });
    if (!existingUser) {
      const demoUser = new User({
        username: 'demo',
        email: 'demo@example.com',
        password: 'password123'
      });
      
      await demoUser.save();
      
      // Create wallet for demo user
      const wallet = new Wallet({
        name: 'Demo Wallet',
        address: '0x' + Math.random().toString(16).substring(2, 12).toUpperCase(),
        balance: 100,
        owner: demoUser._id
      });
      
      await wallet.save();
      
      // Add wallet to user
      demoUser.wallets.push({
        id: wallet._id,
        name: wallet.name,
        address: wallet.address,
        balance: wallet.balance,
        createdAt: new Date()
      });
      
      await demoUser.save();
      
      console.log('Demo user created with wallet');
      console.log(`Demo login: demo@example.com / password123`);
    } else {
      console.log('Demo user already exists');
    }
  } catch (err) {
    console.error('Error creating demo user:', err);
  }
}

// Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    let user = await User.findOne({ $or: [{ email }, { username }] });
    
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    user = new User({
      username,
      email,
      password
    });
    
    await user.save();
    
    // Generate JWT
    const token = jwt.sign(
      { id: user._id },
      'blockchain-app-secret-key',
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
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { id: user._id },
      'blockchain-app-secret-key',
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
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/blockchain', async (req, res) => {
  try {
    const blocks = await Block.find().sort({ index: 1 });
    res.json({ blocks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/wallets', authenticate, async (req, res) => {
  try {
    res.json(req.user.wallets || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/wallets/:id', authenticate, async (req, res) => {
  try {
    const wallet = req.user.wallets.find(w => w.id.toString() === req.params.id);
    
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    
    res.json(wallet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/wallets', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Please provide a wallet name' });
    }
    
    const wallet = new Wallet({
      name,
      address: '0x' + Math.random().toString(16).substring(2, 12).toUpperCase(),
      balance: 0,
      owner: req.user._id
    });
    
    await wallet.save();
    
    const walletData = {
      id: wallet._id,
      name: wallet.name,
      address: wallet.address,
      balance: wallet.balance,
      createdAt: wallet.createdAt
    };
    
    req.user.wallets.push(walletData);
    await req.user.save();
    
    res.status(201).json(walletData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/wallets/:id/qrcode', authenticate, async (req, res) => {
  try {
    const wallet = req.user.wallets.find(w => w.id.toString() === req.params.id);
    
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    
    // In a real app, we'd generate an actual QR code
    // Here we just return a dummy data URL
    res.json({ 
      qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==` 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/transactions/calculate-fee', authenticate, async (req, res) => {
  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected to blockchain');
  
  // Send blockchain data when a client connects
  Block.find().sort({ index: 1 }).then(blocks => {
    socket.emit('blockchain_update', blocks);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected from blockchain');
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Something went wrong'
  });
});

// Start function
async function startServer() {
  try {
    // Setup MongoDB memory server
    const mongoServer = await setupMongoMemoryServer();
    
    // Create genesis block and demo user
    await createGenesisBlock();
    await createDemoUser();
    
    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Visit http://localhost:${PORT} to access the application`);
      console.log(`Use demo@example.com / password123 to login`);
    });
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
      console.log('MongoDB Memory Server stopped');
      process.exit(0);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start server
startServer();
