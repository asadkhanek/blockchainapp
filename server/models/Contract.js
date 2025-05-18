// Use mock mongoose if USE_MOCK_DB is true
const mongoose = process.env.USE_MOCK_DB === 'true' 
  ? require('../../config/mongoose-mock')
  : require('mongoose');

const ContractSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address: {
    type: String,
    required: true,
    unique: true
  },
  code: {
    type: String,
    required: true
  },
  abi: {
    type: Object,
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  deployedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'terminated'],
    default: 'active'
  },
  txHash: {
    type: String,
    required: true
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  description: {
    type: String
  },
  tags: [{
    type: String
  }],
  executedTransactions: [{
    txHash: String,
    method: String,
    args: Array,
    result: mongoose.Schema.Types.Mixed,
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success'
    },
    gasUsed: Number
  }]
});

module.exports = mongoose.model('Contract', ContractSchema);
