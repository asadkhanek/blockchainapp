// Simple script to start the blockchain app
console.log("Starting the Blockchain App in development mode!");

// We'll create a basic implementation that doesn't rely on MongoDB
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

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
  ]
};

// Mock wallet data
const wallets = [
  {
    id: "wallet-123",
    name: "Demo Wallet",
    address: "0x123456789ABCDEF",
    balance: 100
  }
];

// Set up middleware
app.use(express.json());
app.use(cors());

// Mock user data
const users = [
  {
    id: "user-123",
    username: "demo",
    email: "demo@example.com",
    password: "password123",  // In a real app, this would be hashed
    wallets: [wallets[0].id]
  }
];

// Mock authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token === 'demo-token') {
    req.user = users[0];
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Routes
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }
  
  if (users.find(u => u.email === email || u.username === username)) {
    return res.status(400).json({ message: 'User already exists' });
  }
  
  const newUser = {
    id: `user-${Date.now()}`,
    username,
    email,
    password,  // Would be hashed in a real app
    wallets: []
  };
  
  users.push(newUser);
  
  res.status(201).json({
    token: 'demo-token',
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  res.json({
    token: 'demo-token',
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  });
});

app.get('/api/blockchain', (req, res) => {
  res.json({ blocks: blockchain.chain });
});

app.get('/api/wallets', authenticate, (req, res) => {
  const userWallets = wallets.filter(w => req.user.wallets.includes(w.id));
  res.json(userWallets);
});

app.get('/api/wallets/:id', authenticate, (req, res) => {
  const wallet = wallets.find(w => w.id === req.params.id);
  if (wallet && req.user.wallets.includes(wallet.id)) {
    res.json(wallet);
  } else {
    res.status(404).json({ message: "Wallet not found" });
  }
});

app.post('/api/wallets', (req, res) => {
  const newWallet = {
    id: `wallet-${Date.now()}`,
    name: req.body.name || "New Wallet",
    address: `0x${Math.random().toString(16).substring(2, 12).toUpperCase()}`,
    balance: 0
  };
  wallets.push(newWallet);
  res.status(201).json(newWallet);
});

app.get('/api/wallets/:id/qrcode', (req, res) => {
  const wallet = wallets.find(w => w.id === req.params.id);
  if (wallet) {
    res.json({ qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==` });
  } else {
    res.status(404).json({ message: "Wallet not found" });
  }
});

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

// Serve static assets
app.use(express.static(path.join(__dirname, 'client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected to blockchain');
  socket.emit('blockchain_update', blockchain.chain);
  
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

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in development mode on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
});
