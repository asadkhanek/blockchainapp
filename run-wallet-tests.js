// This is a simple script to run the wallet tests
const { execSync } = require('child_process');

try {
  console.log('Starting wallet tests...');
  const output = execSync('node_modules/.bin/jest server/tests/controllers/wallet.test.js', { 
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  console.log('Tests completed successfully');
} catch (error) {
  console.error('Error running tests:', error);
}
