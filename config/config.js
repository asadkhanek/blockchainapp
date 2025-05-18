require('dotenv').config();

module.exports = {
  // Server configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB configuration
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/blockchain-app',
  
  // JWT configuration
  jwtSecret: process.env.JWT_SECRET || 'secret-key',
  jwtExpiration: process.env.JWT_EXPIRATION || '1d',
  
  // Blockchain configuration
  difficulty: process.env.BLOCKCHAIN_DIFFICULTY || 4,
  miningReward: process.env.MINING_REWARD || 50,
  genesisAmount: process.env.GENESIS_AMOUNT || 1000,
  
  // P2P Server
  p2pPort: process.env.P2P_PORT || 6001,
  peers: process.env.PEERS ? process.env.PEERS.split(',') : [],
  
  // Email configuration
  emailHost: process.env.EMAIL_HOST || 'smtp.example.com',
  emailPort: process.env.EMAIL_PORT || 587,
  emailUser: process.env.EMAIL_USER || '',
  emailPass: process.env.EMAIL_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'noreply@blockchain-app.com',
  
  // File paths
  logsPath: process.env.LOGS_PATH || './logs',
  backupsPath: process.env.BACKUPS_PATH || './backups',
  contractsPath: process.env.CONTRACTS_PATH || './contracts'
};
