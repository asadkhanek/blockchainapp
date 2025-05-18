// Start the blockchain app with some initial setup
const child_process = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting Blockchain App...');

// Set environment variable for mock DB
process.env.USE_MOCK_DB = 'true';

try {
  // Check if .env exists, if not create it
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('Creating .env file...');
    const envContent = `PORT=5000
MONGO_URI=mongodb://localhost:27017/blockchain-app-test
JWT_SECRET=development_jwt_secret_key
NODE_ENV=development
P2P_PORT=5001
PEERS=
USE_MOCK_DB=true`;
    fs.writeFileSync(envPath, envContent);
  }

  // Start the server
  console.log('Starting server...');
  const server = child_process.spawn('node', ['server/index.js'], {
    stdio: 'inherit',
    env: { ...process.env, USE_MOCK_DB: 'true' }
  });
  
  server.on('error', (err) => {
    console.error('Failed to start server:', err);
  });

} catch (err) {
  console.error('Error starting app:', err);
}
