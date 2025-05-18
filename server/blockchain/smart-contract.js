const SHA256 = require('crypto-js/sha256');
const { v4: uuidv4 } = require('uuid');
const VM = require('vm');

class SmartContract {
  constructor(code, name, owner, initParams = {}) {
    this.id = uuidv4();
    this.code = code;
    this.name = name;
    this.owner = owner; // Owner's wallet address
    this.createdAt = Date.now();
    this.state = {
      ...initParams,
      owner: owner,
      balance: 0,
      transactions: []
    };
    this.version = 1;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return SHA256(
      this.id +
      this.code +
      this.name +
      this.owner +
      this.createdAt +
      JSON.stringify(this.state) +
      this.version
    ).toString();
  }

  // Execute contract method with given parameters
  execute(method, params, sender, value = 0) {
    if (!this.code.includes(`function ${method}`)) {
      throw new Error(`Method ${method} does not exist in contract ${this.name}`);
    }

    // Create a sandbox context for the contract execution
    const sandboxContext = {
      state: { ...this.state },
      sender: sender,
      value: value,
      params: params,
      result: null,
      console: {
        log: (...args) => console.log(`[Contract ${this.name}]:`, ...args)
      },
      require: (module) => {
        // Only allow specific safe modules
        const allowedModules = ['crypto-js'];
        if (allowedModules.includes(module)) {
          return require(module);
        }
        throw new Error(`Module ${module} is not allowed in smart contracts`);
      }
    };

    try {
      // Create execution script
      const executionScript = `
        ${this.code}
        
        // Execute the requested method
        result = ${method}(params);
      `;

      // Execute in sandbox
      VM.createContext(sandboxContext);
      VM.runInContext(executionScript, sandboxContext);

      // Record the transaction
      const tx = {
        timestamp: Date.now(),
        sender: sender,
        method: method,
        params: params,
        value: value
      };

      // Update contract state
      this.state = sandboxContext.state;
      this.state.transactions.push(tx);
      
      if (value > 0) {
        this.state.balance += value;
      }

      // Update contract hash
      this.version++;
      this.hash = this.calculateHash();

      return {
        success: true,
        result: sandboxContext.result,
        state: this.state
      };
    } catch (error) {
      console.error(`Contract execution error in ${this.name}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Transfer funds from contract to an address
  transfer(to, amount, sender) {
    // Only owner or contract itself can transfer funds
    if (sender !== this.owner && sender !== this.id) {
      throw new Error('Only owner can transfer funds from contract');
    }

    if (amount <= 0) {
      throw new Error('Transfer amount must be positive');
    }

    if (this.state.balance < amount) {
      throw new Error('Insufficient contract balance');
    }

    this.state.balance -= amount;
    
    const tx = {
      timestamp: Date.now(),
      sender: this.id,
      receiver: to,
      amount: amount,
      type: 'transfer'
    };

    this.state.transactions.push(tx);
    
    // Update contract hash
    this.version++;
    this.hash = this.calculateHash();
    
    return {
      success: true,
      transaction: tx
    };
  }
  
  // Get contract information
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      owner: this.owner,
      createdAt: this.createdAt,
      balance: this.state.balance,
      version: this.version,
      hash: this.hash
    };
  }

  // Update contract code (only by owner)
  update(newCode, sender) {
    if (sender !== this.owner) {
      throw new Error('Only owner can update contract code');
    }

    this.code = newCode;
    this.version++;
    this.hash = this.calculateHash();
    
    return {
      success: true,
      version: this.version,
      hash: this.hash
    };
  }
}

class SmartContractEngine {
  constructor() {
    this.contracts = new Map();
  }

  // Deploy a new smart contract
  deployContract(code, name, owner, initParams = {}) {
    const contract = new SmartContract(code, name, owner, initParams);
    this.contracts.set(contract.id, contract);
    return contract;
  }

  // Get contract by ID
  getContract(contractId) {
    if (!this.contracts.has(contractId)) {
      throw new Error(`Contract with ID ${contractId} not found`);
    }
    return this.contracts.get(contractId);
  }

  // Execute contract method
  executeContract(contractId, method, params, sender, value = 0) {
    const contract = this.getContract(contractId);
    return contract.execute(method, params, sender, value);
  }

  // Get all contracts
  getAllContracts() {
    return Array.from(this.contracts.values()).map(contract => contract.getInfo());
  }

  // Get contracts by owner
  getContractsByOwner(owner) {
    return Array.from(this.contracts.values())
      .filter(contract => contract.owner === owner)
      .map(contract => contract.getInfo());
  }

  // Delete contract (only by owner)
  deleteContract(contractId, sender) {
    const contract = this.getContract(contractId);
    
    if (contract.owner !== sender) {
      throw new Error('Only owner can delete contract');
    }
    
    this.contracts.delete(contractId);
    
    return {
      success: true,
      message: `Contract ${contract.name} was deleted`
    };
  }
}

module.exports = { SmartContract, SmartContractEngine };
