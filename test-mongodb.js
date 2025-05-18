// MongoDB connection test script
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blockchain-app';

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log(`Connection URI: ${MONGO_URI}`);
  
  try {
    console.log('Attempting to connect...');
    const conn = await mongoose.connect(MONGO_URI, {});
    
    console.log('✓ MongoDB Connection Successful!');
    console.log(`Connected to: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
    
    // Create test collection and document
    console.log('\nCreating test collection...');
    const testSchema = new mongoose.Schema({
      name: String,
      timestamp: Date
    });
    
    // Create model
    const Test = mongoose.model('TestConnection', testSchema);
    
    // Create document
    const testDoc = new Test({
      name: 'MongoDB Connection Test',
      timestamp: new Date()
    });
    
    // Save document
    await testDoc.save();
    console.log('✓ Test document created successfully');
    
    // Find document
    const found = await Test.findOne({ name: 'MongoDB Connection Test' });
    console.log('✓ Test document found:');
    console.log(`  Name: ${found.name}`);
    console.log(`  Timestamp: ${found.timestamp}`);
    
    // Remove test document
    await Test.deleteMany({});
    console.log('✓ Test document cleanup completed');
    
    console.log('\n✓✓✓ MongoDB is working correctly! ✓✓✓');
  } catch (error) {
    console.error('✗ MongoDB Connection Failed!');
    console.error(`Error: ${error.message}`);
    console.log('\nTroubleshooting steps:');
    console.log('1. Make sure MongoDB is installed and running');
    console.log('2. Check the MongoDB connection string in your .env file');
    console.log('3. If using MongoDB Atlas, verify the username, password and network access settings');
    console.log('4. Try restarting the MongoDB service');
  } finally {
    // Close connection
    await mongoose.disconnect();
    process.exit();
  }
}

testConnection();
