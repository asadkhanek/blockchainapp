// MongoDB connection manager
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

/**
 * MongoDB Connection Manager
 * Handles connections to MongoDB with fallback to MongoDB Memory Server
 */
class MongoDBManager {
  constructor() {
    this.isConnected = false;
    this.mongoMemoryServer = null;
  }

  /**
   * Connect to MongoDB
   * @param {string} uri MongoDB connection string
   * @param {boolean} useMemoryFallback Whether to use MongoDB Memory Server as fallback
   */
  async connect(uri, useMemoryFallback = true) {
    try {
      console.log('Attempting to connect to MongoDB...');
      
      // Try connecting to the provided MongoDB URI
      await mongoose.connect(uri, {
        // MongoDB driver already has these as default in newer versions
      });
      
      console.log('Successfully connected to MongoDB!');
      this.isConnected = true;
      return { connected: true, memoryServer: false };
    } catch (err) {
      console.error(`Failed to connect to MongoDB: ${err.message}`);
      
      // If memory fallback is enabled, try using MongoDB Memory Server
      if (useMemoryFallback) {
        try {
          console.log('Attempting to start MongoDB Memory Server...');
          
          // Create MongoDB Memory Server instance
          this.mongoMemoryServer = await MongoMemoryServer.create();
          const memoryServerUri = this.mongoMemoryServer.getUri();
          
          console.log(`MongoDB Memory Server started at ${memoryServerUri}`);
          
          // Connect to Memory Server
          await mongoose.connect(memoryServerUri);
          
          console.log('Successfully connected to MongoDB Memory Server!');
          this.isConnected = true;
          return { connected: true, memoryServer: true, uri: memoryServerUri };
        } catch (memErr) {
          console.error(`Failed to start MongoDB Memory Server: ${memErr.message}`);
        }
      }
      
      // If all connection attempts fail
      console.warn('Operating in disconnected mode with fallback data');
      return { connected: false, error: err.message };
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
    
    if (this.mongoMemoryServer) {
      await this.mongoMemoryServer.stop();
      console.log('MongoDB Memory Server stopped');
      this.mongoMemoryServer = null;
    }
    
    this.isConnected = false;
  }

  /**
   * Check if connected to MongoDB
   */
  isConnectedToMongoDB() {
    return this.isConnected;
  }
}

module.exports = new MongoDBManager();
