// Start the blockchain app with MongoDB connection
const child_process = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting Blockchain App with MongoDB connection...');

// Use the mock database for now since we don't have MongoDB installed locally
console.log('NOTICE: Using mock database since MongoDB is not installed locally.');
console.log('To use a real MongoDB instance, please install MongoDB and update the MONGO_URI in .env file.');
console.log('Visit https://www.mongodb.com/try/download/community to download and install MongoDB.');

// Set USE_MOCK_DB to true for now
process.env.USE_MOCK_DB = 'true';

try {  // Check if .env exists, if not create it
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('Creating .env file...');
    const envContent = `PORT=5000
MONGO_URI=mongodb://localhost:27017/blockchain-app
JWT_SECRET=development_jwt_secret_key
NODE_ENV=development
P2P_PORT=5001
PEERS=
USE_MOCK_DB=true`;
    fs.writeFileSync(envPath, envContent);
  } else {
    // Read existing .env file
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // For now, ensure USE_MOCK_DB=true until MongoDB is properly installed
    if (envContent.includes('USE_MOCK_DB=')) {
      envContent = envContent.replace(/USE_MOCK_DB=.*/, 'USE_MOCK_DB=true');
    } else {
      envContent += '\nUSE_MOCK_DB=true';
    }
    
    // Write back the updated content
    fs.writeFileSync(envPath, envContent);
    console.log('Updated .env file with USE_MOCK_DB=true');
  }
  // Start the server
  console.log('Starting server with mock database...');
  const server = child_process.spawn('node', ['server/index.js'], {
    stdio: 'inherit',
    env: { ...process.env, USE_MOCK_DB: 'true' }
  });

  server.on('error', (err) => {
    console.error('Failed to start server:', err);
  });

  process.on('SIGINT', () => {
    console.log('Stopping server...');
    server.kill('SIGINT');
    process.exit();
  });
} catch (error) {
  console.error('Error starting application:', error);
  process.exit(1);
}
