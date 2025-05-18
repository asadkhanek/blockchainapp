// Minimal express server for blockchain app
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const qrcode = require('qrcode');

// Create Express app
const app = express();
const server = http.createServer(app);

// Mock data for blockchain demo
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
    }
  ]
};

// Mock wallets
const wallets = [
  {
    id: "wallet-1",
    name: "Main Wallet",
    address: "0x1234567890ABCDEF",
    balance: 50
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

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Blockchain route
app.get('/api/blockchain', (req, res) => {
  res.json(blockchain);
});

// Auth routes
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

app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }
  
  // For demo purposes, we'll just return a success
  res.status(201).json({
    token: 'demo-token',
    user: {
      id: 'user-' + Date.now(),
      username,
      email
    }
  });
});

// Wallet routes
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
    address: '0x' + Math.random().toString(16).substring(2, 10).toUpperCase(),
    balance: 0
  };
  
  user.wallets.push(newWallet);
  
  res.status(201).json(newWallet);
});

app.get('/api/wallets/:id/qrcode', authenticate, async (req, res) => {
  const wallet = req.user.wallets.find(w => w.id === req.params.id);
  
  if (!wallet) {
    return res.status(404).json({ message: 'Wallet not found' });
  }
  
  try {
    // Generate QR code
    const qrData = `blockchain:${wallet.address}`;
    const qrCodeDataUrl = await qrcode.toDataURL(qrData);
    
    res.json({ qrCode: qrCodeDataUrl });
  } catch (err) {
    // If qrcode fails, send a fallback
    res.json({ 
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAACECAYAAABRRIOnAAAAAklEQVR4AewaftIAAAOPSURBVO3BQY4cSRLAQDLQ//8yV0c/JZCoain6cTAz/2GtcSxrjWNZaxzLWuNY1hrHstY4lrXGsaw1jmWtcSxrjWNZaxzLWuNY1hrHsta4ePBJld+kcinlN1V+UuUTy1rjWNYax7LWuPiiyjeVnlC6ULpQulC6ULpQulC6UOmJ0jdVvmlZaxzLWuNY1hoXD35Y5YnSTyldKF0ofULpidITlZ9UeWJZaxzLWuNY1hoXD9YvlP5NLGuNY1lrHMta4+LBh1V+k9KF0oXShdKF0m9SeaL0TctaazuWtcaxrDUuHvxlSk8o/ZdVnlD6S5a1xrGsNY5lrXHx4EMqf5nSE0pPKP3Syv9jWWscy1rjWNYaFw9+WOUvU7pQeqJ0oXSh9ITSv2lZaxzLWuNY1hoXDz6p8k1KF0pPKH1C6UKlC6UnlC6UnlC6ULpQ+qZlrXEsa41jWWtcPPiXKT2h9AmV/7LKNy1rjWNZaxzLWuPiwTqWtcaxrDWOZa1x8eCDKhdKFyoXSk+oXChdKF0oXShdKF0oXShdKF0oXaF0ofJNy1rjWNYax7LWuHjwSSoXSk8oXShdKF0oXShdKF0oXSg9ofJE5ULpCZVvWtYax7LWOJa1xsUD/mGVJ5S+qXSh9IllfWJZaxzLWuPiwR9WuVC6ULpQulC6ULpQeqJ0ofSE0oXShcqFyk8sa41jWWscy1rj4sGHVJ5QeqL0hNITpQulJ5SeKF0o/STlE8ta41jWGsey1rh48CGlb1K6UHpC6ULpCaULpSdKTyg9ofRNy1rjWNYax7LWmH/4JqULpQulC6ULpQuVC6ULpSdKTyhdKF0oXShdKF0ofWJZaxzLWuNY1hoXD35Y5ScpXSg9oXShdKF0ofSE0oXSE0oXSk8oXSj9pGWtcSxrjWNZa1w8+GWlC6UnlC5UulC6ULpQulC6ULpQulB6ovRE6S9Z1hrHstY4lrXGxYOfVLpQulC6ULpQulD6hNITpQulC5UnlC6UnlC6ULpQulD6xLLWOJa1xrGsNS4e/LDKE0oXShdKF0rfVLpQekLpN5WeUPqmZa1xLGuNY1lrzH/4H1O6ULpQulC6ULpQulB6onSh9ITShcrFsn6yrDWOZa1xLGuNiwd8UOUTSt+kdKF0ofSE0oXShdIT/6ZlrXEsa41jWWscy1rjWNYax7LWOJa1xrGsNY5lrXEsa41jWWscy1rjWNYax7LWOJa1xrGsNf4DSQ+EbrftXpIAAAAASUVORK5CYII='
    });
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

// Serve static files if they exist
const staticPath = path.join(__dirname, 'client/build');
app.use(express.static(staticPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
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
