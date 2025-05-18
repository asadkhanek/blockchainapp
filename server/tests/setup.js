const mongoose = require('mongoose');
const config = require('../../config/config');

// Setup function before all tests
beforeAll(async () => {
  // Connect to a test database
  await mongoose.connect(config.mongoURI, {
    dbName: 'blockchain-app-test'
  });
});

// Cleanup function after all tests
afterAll(async () => {
  // Clean up test database
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// Reset database state before each test
beforeEach(async () => {
  // Get all collections
  const collections = mongoose.connection.collections;
  
  // Clear all collections
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
