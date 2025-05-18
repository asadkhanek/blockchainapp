// Simple blockchain app server
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

// Create Express app
const app = express();
const server = http.createServer(app);

// Mock blockchain data
const blockchain = {
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
    },
    {
      index: 2,
      timestamp: Date.now() - 250000,
      transactions: [
        {
          id: "tx2",
          from: "wallet-1",
          to: "wallet-2",
          amount: 10,
          fee: 0.2,
          timestamp: Date.now() - 300000
        }
      ],
      hash: "block-hash-2",
      previousHash: "block-hash-1",
      difficulty: 4,
      nonce: 5678
    }
  ]
};

// Mock wallet data
const wallets = [
  {
    id: "wallet-1",
    name: "Main Wallet",
    address: "0x1234567890ABCDEF",
    balance: 40
  },
  {
    id: "wallet-2",
    name: "Savings Wallet",
    address: "0xABCDEF1234567890",
    balance: 10
  }
];

// Mock user
let user = {
  id: "user-1",
  username: "demo",
  email: "demo@example.com",
  password: "password123",
  wallets: wallets
};

// Middleware
app.use(express.json());
app.use(cors());

// Simple authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token === 'demo-token') {
    req.user = user;
    next();
  } else {
    res.status(401).json({ message: 'Authentication required' });
  }
};

// Routes
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }
  
  // In a real app, we would create a new user here
  
  res.status(201).json({
    token: 'demo-token',
    user: {
      id: user.id,
      username: username,
      email: email
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }
  
  if (email === 'demo@example.com' && password === 'password123') {
    res.json({
      token: 'demo-token',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.get('/api/blockchain', (req, res) => {
  res.json(blockchain);
});

app.get('/api/wallets', authenticate, (req, res) => {
  res.json(req.user.wallets);
});

app.get('/api/wallets/:id', authenticate, (req, res) => {
  const wallet = req.user.wallets.find(w => w.id === req.params.id);
  
  if (!wallet) {
    return res.status(404).json({ message: 'Wallet not found' });
  }
  
  res.json(wallet);
});

app.post('/api/wallets', authenticate, (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Please provide a wallet name' });
  }
  
  const newWallet = {
    id: `wallet-${Date.now()}`,
    name: name,
    address: '0x' + Math.random().toString(16).substring(2, 12).toUpperCase(),
    balance: 0
  };
  
  user.wallets.push(newWallet);
  
  res.status(201).json(newWallet);
});

app.get('/api/wallets/:id/qrcode', authenticate, (req, res) => {
  const wallet = req.user.wallets.find(w => w.id === req.params.id);
  
  if (!wallet) {
    return res.status(404).json({ message: 'Wallet not found' });
  }
  
  // In a real app, we'd generate an actual QR code
  // Here we just return a dummy image
  res.json({ 
    qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==` 
  });
});

app.get('/api/transactions/calculate-fee', authenticate, (req, res) => {
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

// Serve static files if they exist
try {
  const staticPath = path.join(__dirname, 'client/build');
  if (require('fs').existsSync(staticPath)) {
    app.use(express.static(staticPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }
} catch (err) {
  console.log('No static files found, running API server only');
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════╗
  ║                                            ║
  ║   Blockchain App Server Running!           ║
  ║                                            ║
  ║   - API running on http://localhost:${PORT}    ║
  ║                                            ║
  ║   Test credentials:                        ║
  ║     Email: demo@example.com                ║
  ║     Password: password123                  ║
  ║                                            ║
  ╚════════════════════════════════════════════╝
  `);
});
