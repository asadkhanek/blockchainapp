const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config();

// Import config and database connection
const config = require('../config/config');
const connectDB = require('../config/database'); // Using the root config database connection

// Import route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const walletRoutes = require('./routes/wallets');
const blockchainRoutes = require('./routes/blockchain');
const transactionRoutes = require('./routes/transactions');
const contractRoutes = require('./routes/contracts');
const adminRoutes = require('./routes/admin');

// Import blockchain core
const Blockchain = require('./blockchain/blockchain');
const P2PServer = require('./blockchain/p2p-server');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize blockchain
const blockchain = new Blockchain();
const p2pServer = new P2PServer(blockchain);

// Middleware
app.use(express.json());
app.use(cors());

// Define Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/admin', adminRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
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

// Make io accessible to our router
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message
  });
});

// Define PORT
const PORT = process.env.PORT || 5000;

// Connect to MongoDB and then start the server
connectDB()
  .then(() => {
    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      p2pServer.listen();
      
      if (process.env.USE_MOCK_DB === 'true') {
        console.log('WARNING: Running with mock database - persistence is not available');
      }
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Starting server without database in development mode');
      server.listen(PORT, () => {
        console.log(`Server running on port ${PORT} (no database)`);
        p2pServer.listen();
      });
    } else {
      process.exit(1);
    }
  });

module.exports = app;
