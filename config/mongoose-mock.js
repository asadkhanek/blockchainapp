// Mock MongoDB implementation for development without an actual MongoDB instance
const EventEmitter = require('events');

class MockMongoose {
  constructor() {
    this.models = {};
    this.collections = {};
    // Add Schema constructor
    this.Schema = class Schema {
      constructor(definition, options = {}) {
        this.definition = definition;
        this.options = options;
        this.methods = {};
        this.statics = {};
        this.pre = function() { return this; };
        this.post = function() { return this; };
      }
    };
    
    // Add Schema.Types
    this.Schema.Types = {
      ObjectId: String,
      Mixed: Object
    };
    
    this.connection = {
      host: 'mock-db',
      name: 'blockchain-app-mock',
      collections: {},
      dropDatabase: async () => {
        this.collections = {};
        console.log('Mock database dropped');
      }
    };
  }
  model(name, schema) {
    if (!this.models[name]) {
      // Create collection
      this.collections[name] = [];
      this.connection.collections[name] = {
        deleteMany: async () => {
          this.collections[name] = [];
          return { deletedCount: 0 };
        }
      };

      // Create model class
      const ModelClass = class {
        constructor(data) {
          Object.assign(this, data);
          this._id = Math.random().toString(36).substring(2, 15);
          this.createdAt = new Date();
          this.updatedAt = new Date();
        }

        static async find(query = {}) {
          return this.prototype.constructor.mockMongoose.filterData(this.modelName, query);
        }

        static async findOne(query = {}) {
          const results = await this.find(query);
          return results[0] || null;
        }

        static async findById(id) {
          return this.findOne({ _id: id });
        }

        async save() {
          this.updatedAt = new Date();
          const collection = this.constructor.mockMongoose.collections[this.constructor.modelName];
          const existing = collection.findIndex(item => item._id === this._id);
          
          if (existing >= 0) {
            collection[existing] = this;
          } else {
            collection.push(this);
          }
          return this;
        }

        static async deleteOne(query) {
          const collection = this.prototype.constructor.mockMongoose.collections[this.modelName];
          const index = collection.findIndex(item => {
            for (const key in query) {
              if (item[key] !== query[key]) return false;
            }
            return true;
          });
          
          if (index !== -1) {
            collection.splice(index, 1);
            return { deletedCount: 1 };
          }
          
          return { deletedCount: 0 };
        }
      };
        // Add reference to this mongoose instance
      ModelClass.prototype.constructor.mockMongoose = this;
      ModelClass.mockMongoose = this;
      
      // Copy schema methods
      if (schema && schema.methods) {
        Object.keys(schema.methods).forEach(methodName => {
          ModelClass.prototype[methodName] = schema.methods[methodName];
        });
      }
      
      // Store model
      ModelClass.modelName = name;
      this.models[name] = ModelClass;

      this.models[name].modelName = name;
      this.models[name].collections = this.collections;
    }

    return this.models[name];
  }
  filterData(modelName, query) {
    return this.collections[modelName] ? 
      this.collections[modelName].filter(item => {
        for (const key in query) {
          if (item[key] !== query[key]) return false;
        }
        return true;
      }) : [];
  }

  async connect(uri, options) {
    console.log('Connected to mock MongoDB');
    return {
      connection: this.connection
    };
  }

  async disconnect() {
    console.log('Disconnected from mock MongoDB');
    return true;
  }
}

// Create mock instance
const mockMongoose = new MockMongoose();

// Export a function to conditionally use real mongoose or mock
module.exports = process.env.USE_MOCK_DB === 'true' ? mockMongoose : require('mongoose');
