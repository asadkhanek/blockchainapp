const SHA256 = require('crypto-js/sha256');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const { v4: uuidv4 } = require('uuid');

class Block {
  constructor(timestamp, transactions, previousHash = '') {
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
    this.nonce = 0;
  }

  calculateHash() {
    return SHA256(
      this.previousHash +
      this.timestamp +
      JSON.stringify(this.transactions) +
      this.nonce
    ).toString();
  }

  mineBlock(difficulty) {
    const target = Array(difficulty + 1).join('0');
    
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    
    console.log(`Block mined: ${this.hash}`);
  }

  hasValidTransactions() {
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }
    return true;
  }
}

class Transaction {
  constructor(fromAddress, toAddress, amount, fee = 0) {
    this.id = uuidv4();
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.fee = fee;
    this.timestamp = Date.now();
    this.signature = '';
  }

  calculateHash() {
    return SHA256(
      this.fromAddress +
      this.toAddress +
      this.amount +
      this.fee +
      this.timestamp
    ).toString();
  }

  signTransaction(signingKey) {
    if (signingKey.getPublic('hex') !== this.fromAddress) {
      throw new Error('You cannot sign transactions for other wallets!');
    }

    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, 'base64');
    this.signature = sig.toDER('hex');
  }

  isValid() {
    // Mining reward transactions don't have a from address
    if (this.fromAddress === null) return true;

    if (!this.signature || this.signature.length === 0) {
      throw new Error('No signature in this transaction');
    }

    const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
    return publicKey.verify(this.calculateHash(), this.signature);
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 2;
    this.pendingTransactions = [];
    this.miningReward = 100;
    this.blockTime = 10000; // Target time between blocks in ms
    this.lastBlockTime = Date.now();
  }

  createGenesisBlock() {
    return new Block(Date.now(), [], '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(miningRewardAddress) {
    // Sort transactions by fee (highest fee first)
    const sortedTransactions = [...this.pendingTransactions]
      .sort((a, b) => b.fee - a.fee);
    
    // Take the first 10 transactions or all if less than 10
    const transactionsToInclude = sortedTransactions.slice(0, 10);
    
    // Create mining reward transaction
    const rewardTx = new Transaction(
      null,
      miningRewardAddress,
      this.miningReward,
      0
    );
    transactionsToInclude.push(rewardTx);

    // Create and mine the new block
    const block = new Block(
      Date.now(),
      transactionsToInclude,
      this.getLatestBlock().hash
    );
    
    block.mineBlock(this.difficulty);
    this.chain.push(block);

    // Remove mined transactions from pending
    this.pendingTransactions = this.pendingTransactions.filter(
      tx => !transactionsToInclude.includes(tx)
    );

    // Adjust difficulty based on block time
    this.adjustDifficulty();
  }

  adjustDifficulty() {
    const currentTime = Date.now();
    const timeElapsed = currentTime - this.lastBlockTime;
    
    if (timeElapsed < this.blockTime / 2) {
      this.difficulty++;
    } else if (timeElapsed > this.blockTime * 2) {
      this.difficulty = Math.max(1, this.difficulty - 1);
    }
    
    this.lastBlockTime = currentTime;
  }

  addTransaction(transaction) {
    // Verify the transaction
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error('Transaction must include from and to address');
    }

    if (!transaction.isValid()) {
      throw new Error('Cannot add invalid transaction to chain');
    }

    if (transaction.amount <= 0) {
      throw new Error('Transaction amount should be higher than 0');
    }

    // Verify sender has enough balance
    const balance = this.getBalanceOfAddress(transaction.fromAddress);
    if (balance < transaction.amount + transaction.fee) {
      throw new Error('Not enough balance');
    }

    this.pendingTransactions.push(transaction);
    return this.pendingTransactions.length;
  }

  getBalanceOfAddress(address) {
    let balance = 0;

    // Check each block's transactions
    for (const block of this.chain) {
      for (const trans of block.transactions) {
        // If the address is the sender, subtract the amount from the balance
        if (trans.fromAddress === address) {
          balance -= trans.amount;
          balance -= trans.fee;
        }

        // If the address is the recipient, add the amount to the balance
        if (trans.toAddress === address) {
          balance += trans.amount;
        }
      }
    }

    // Check pending transactions
    for (const trans of this.pendingTransactions) {
      if (trans.fromAddress === address) {
        balance -= trans.amount;
        balance -= trans.fee;
      }
      if (trans.toAddress === address) {
        balance += trans.amount;
      }
    }

    return balance;
  }

  getTransactionsOfAddress(address) {
    const txs = [];

    // Check in the blockchain
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address || tx.toAddress === address) {
          txs.push({
            ...tx,
            confirmations: this.chain.length - this.chain.indexOf(block),
            blockHash: block.hash
          });
        }
      }
    }

    // Check in pending transactions
    for (const tx of this.pendingTransactions) {
      if (tx.fromAddress === address || tx.toAddress === address) {
        txs.push({
          ...tx,
          confirmations: 0,
          blockHash: null
        });
      }
    }

    return txs;
  }

  getAllTransactions() {
    const txs = [];

    // Get all transactions from the blockchain
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        txs.push({
          ...tx,
          confirmations: this.chain.length - this.chain.indexOf(block),
          blockHash: block.hash
        });
      }
    }

    // Add pending transactions
    for (const tx of this.pendingTransactions) {
      txs.push({
        ...tx,
        confirmations: 0,
        blockHash: null
      });
    }

    return txs;
  }

  getBlock(hash) {
    return this.chain.find(block => block.hash === hash);
  }
  getTransaction(id) {
    // Search in blockchain
    for (const block of this.chain) {
      const tx = block.transactions.find(t => t.id === id);
      if (tx) {
        return {
          ...tx,
          confirmations: this.chain.length - this.chain.indexOf(block),
          blockHash: block.hash
        };
      }
    }
    // Search in pending transactions
    const pendingTx = this.pendingTransactions.find(t => t.id === id);
    if (pendingTx) {
      return {
        ...pendingTx,
        confirmations: 0,
        blockHash: null
      };
    }
    return null;
  }
  
  // These functions are needed by the transaction controller
  getTransactionById(id) {
    return this.getTransaction(id);
  }
  
  getTransactionsByAddresses(addresses) {
    const transactions = [];
    
    // Get transactions from blockchain
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (addresses.includes(tx.fromAddress) || addresses.includes(tx.toAddress)) {
          transactions.push({
            ...tx,
            confirmations: this.chain.length - this.chain.indexOf(block),
            blockHash: block.hash,
            status: 'confirmed'
          });
        }
      }
    }
    
    // Get pending transactions
    for (const tx of this.pendingTransactions) {
      if (addresses.includes(tx.fromAddress) || addresses.includes(tx.toAddress)) {
        transactions.push({
          ...tx,
          confirmations: 0,
          blockHash: null,
          status: 'pending'
        });
      }
    }
    
    return transactions;
  }
  
  removePendingTransaction(id) {
    const initialLength = this.pendingTransactions.length;
    this.pendingTransactions = this.pendingTransactions.filter(tx => tx.id !== id);
    return initialLength > this.pendingTransactions.length;
  }
  
  calculateMinimumFee(amount) {
    // Minimum fee is 0.1% of transaction amount with a minimum of 0.01
    return Math.max(0.01, amount * 0.001);
  }
  
  calculateRecommendedFee(amount) {
    // Recommended fee is 0.2% of transaction amount with a minimum of 0.05
    return Math.max(0.05, amount * 0.002);
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Validate hash integrity
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      // Validate chain link
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }

      // Validate transactions
      if (!currentBlock.hasValidTransactions()) {
        return false;
      }
    }
    return true;
  }
}

module.exports = { Blockchain, Block, Transaction };
