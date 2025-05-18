// Use mock mongoose if USE_MOCK_DB is true
const mongoose = process.env.USE_MOCK_DB === 'true' 
  ? require('./mongoose-mock')
  : require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    // For development without MongoDB, use mock mode if USE_MOCK_DB is true
    if (process.env.USE_MOCK_DB === 'true') {
      console.log('Using mock database for development');
      return {
        connection: {
          host: 'mock-db',
          name: 'blockchain-app-mock',
        }
      };
    }
    
    // For MongoDB version >= 6.0, the options are different
    const mongooseOptions = {
      // MongoDB driver no longer needs these options as they are now default behavior
      // but we keep them for backward compatibility with older MongoDB versions
    };
    
    // Check if we're in a test environment
    if (process.env.NODE_ENV === 'test') {
      mongooseOptions.dbName = 'blockchain-app-test';
    }
    
    const conn = await mongoose.connect(config.mongoURI, mongooseOptions);
    
    // Log connection info, but not in test environment
    if (process.env.NODE_ENV !== 'test') {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      console.log(`Database Name: ${conn.connection.name}`);
    }
    
    return conn;
  } catch (err) {
    console.error(`Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
