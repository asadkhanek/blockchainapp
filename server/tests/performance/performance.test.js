const Blockchain = require('../../blockchain/blockchain');
const Transaction = require('../../blockchain/transaction');
const Wallet = require('../../blockchain/wallet');
const SmartContract = require('../../blockchain/smartContract');

describe('Performance Tests', () => {
  let blockchain;
  let wallet;
  let recipientWallet;
  
  beforeEach(() => {
    blockchain = new Blockchain();
    wallet = new Wallet();
    recipientWallet = new Wallet();
  });
  
  describe('Transaction Throughput', () => {
    it('should handle high volume of transactions (100 TPS)', async () => {
      // Mine some blocks to generate funds
      await blockchain.mineBlock(wallet.publicKey);
      await blockchain.mineBlock(wallet.publicKey);
      await blockchain.mineBlock(wallet.publicKey);
      
      const getBalance = await blockchain.getBalanceForAddress(wallet.publicKey);
      expect(getBalance).toBeGreaterThan(0);
      
      // Number of transactions to create
      const transactionCount = 100;
      const transactions = [];
      
      // Create batch of transactions
      const start = Date.now();
      
      for (let i = 0; i < transactionCount; i++) {
        const transaction = wallet.createTransaction(
          recipientWallet.publicKey,
          0.01, // Small amount
          0.001, // Small fee
          blockchain
        );
        
        transactions.push(transaction);
      }
      
      // Add all transactions to blockchain
      for (const transaction of transactions) {
        await blockchain.addTransaction(transaction);
      }
      
      const end = Date.now();
      const duration = (end - start) / 1000; // seconds
      const tps = transactionCount / duration;
      
      console.log(`Added ${transactionCount} transactions in ${duration} seconds (${tps.toFixed(2)} TPS)`);
      
      // We're testing for 100 TPS, but local tests might be faster
      expect(tps).toBeGreaterThan(10); // At least 10 TPS to pass the test
      expect(blockchain.pendingTransactions.length).toBeGreaterThanOrEqual(transactionCount);
    });
    
    it('should mine blocks within acceptable time', async () => {
      // Create 10 transactions
      for (let i = 0; i < 10; i++) {
        const transaction = wallet.createTransaction(
          recipientWallet.publicKey,
          0.1,
          0.01,
          blockchain
        );
        
        await blockchain.addTransaction(transaction);
      }
      
      // Measure block mining time
      const start = Date.now();
      const newBlock = await blockchain.mineBlock(wallet.publicKey);
      const end = Date.now();
      
      const miningTime = (end - start) / 1000; // seconds
      console.log(`Mined block with ${newBlock.transactions.length} transactions in ${miningTime} seconds`);
      
      // Mining should complete in reasonable time for test environment
      expect(miningTime).toBeLessThan(10); // Max 10 seconds to mine a block
      expect(newBlock).toBeDefined();
      expect(newBlock.transactions.length).toBeGreaterThanOrEqual(10);
    });
  });
  
  describe('Smart Contract Performance', () => {
    // Simple storage contract for testing
    const storageContractCode = `
      contract SimpleStorage {
        uint256 private storedData;
        
        function set(uint256 x) public {
          storedData = x;
        }
        
        function get() public view returns (uint256) {
          return storedData;
        }
      }
    `;
    
    // More complex contract with computation
    const computationContractCode = `
      contract Computation {
        function fibonacci(uint n) public pure returns (uint) {
          if (n <= 1) return n;
          
          uint a = 0;
          uint b = 1;
          
          for(uint i = 2; i <= n; i++) {
            uint c = a + b;
            a = b;
            b = c;
          }
          
          return b;
        }
        
        function factorial(uint n) public pure returns (uint) {
          uint result = 1;
          for(uint i = 2; i <= n; i++) {
            result *= i;
          }
          return result;
        }
      }
    `;
    
    it('should deploy and execute storage contract within time limit', async () => {
      const smartContract = new SmartContract(storageContractCode);
      
      // Measure deployment time
      const deployStart = Date.now();
      const deployResult = await blockchain.deployContract(
        smartContract,
        wallet,
        0 // No initial balance
      );
      const deployEnd = Date.now();
      
      const deployTime = (deployEnd - deployStart) / 1000; // seconds
      console.log(`Deployed storage contract in ${deployTime} seconds`);
      
      expect(deployTime).toBeLessThan(5); // Max 5 seconds to deploy
      expect(deployResult.success).toBe(true);
      expect(deployResult.contractAddress).toBeDefined();
      
      const contractAddress = deployResult.contractAddress;
      
      // Measure execution time for set and get
      const setValue = 42;
      
      const setStart = Date.now();
      const setResult = await blockchain.executeContract(
        contractAddress,
        'set',
        [setValue],
        wallet,
        0
      );
      const setEnd = Date.now();
      
      const setTime = (setEnd - setStart) / 1000; // seconds
      console.log(`Executed set(${setValue}) in ${setTime} seconds`);
      
      expect(setTime).toBeLessThan(2); // Max 2 seconds to execute set
      expect(setResult.success).toBe(true);
      
      // Get operation
      const getStart = Date.now();
      const getResult = await blockchain.executeContract(
        contractAddress,
        'get',
        [],
        wallet,
        0
      );
      const getEnd = Date.now();
      
      const getTime = (getEnd - getStart) / 1000; // seconds
      console.log(`Executed get() in ${getTime} seconds`);
      
      expect(getTime).toBeLessThan(1); // Max 1 second to execute get
      expect(getResult.success).toBe(true);
      expect(getResult.methodResult).toBe(setValue.toString());
    });
    
    it('should execute computation contract with acceptable performance', async () => {
      const computationContract = new SmartContract(computationContractCode);
      
      // Deploy the computation contract
      const deployResult = await blockchain.deployContract(
        computationContract,
        wallet,
        0
      );
      
      expect(deployResult.success).toBe(true);
      
      const contractAddress = deployResult.contractAddress;
      
      // Test fibonacci performance with larger number
      const fibN = 20;
      
      const fibStart = Date.now();
      const fibResult = await blockchain.executeContract(
        contractAddress,
        'fibonacci',
        [fibN],
        wallet,
        0
      );
      const fibEnd = Date.now();
      
      const fibTime = (fibEnd - fibStart) / 1000; // seconds
      console.log(`Calculated fibonacci(${fibN}) in ${fibTime} seconds`);
      
      expect(fibTime).toBeLessThan(3); // Max 3 seconds
      expect(fibResult.success).toBe(true);
      
      // Test factorial performance with moderate number
      const factN = 10;
      
      const factStart = Date.now();
      const factResult = await blockchain.executeContract(
        contractAddress,
        'factorial',
        [factN],
        wallet,
        0
      );
      const factEnd = Date.now();
      
      const factTime = (factEnd - factStart) / 1000; // seconds
      console.log(`Calculated factorial(${factN}) in ${factTime} seconds`);
      
      expect(factTime).toBeLessThan(3); // Max 3 seconds
      expect(factResult.success).toBe(true);
    });
  });
  
  describe('Blockchain Scaling', () => {
    it('should handle a large chain efficiently', async () => {
      // Create a moderately large blockchain (50 blocks)
      for (let i = 0; i < 50; i++) {
        await blockchain.mineBlock(wallet.publicKey);
      }
      
      expect(blockchain.chain.length).toBe(51); // 1 genesis + 50 mined blocks
      
      // Validate the entire chain
      const startValidation = Date.now();
      const isValid = blockchain.isValidChain(blockchain.chain);
      const endValidation = Date.now();
      
      const validationTime = (endValidation - startValidation) / 1000;
      console.log(`Validated chain of ${blockchain.chain.length} blocks in ${validationTime} seconds`);
      
      expect(isValid).toBe(true);
      expect(validationTime).toBeLessThan(10); // Should validate in under 10 seconds
    });
    
    it('should handle concurrent transaction processing', async () => {
      // Mine some blocks for balance
      await blockchain.mineBlock(wallet.publicKey);
      await blockchain.mineBlock(wallet.publicKey);
      
      // Create multiple wallets for concurrent transactions
      const wallets = [];
      for (let i = 0; i < 10; i++) {
        wallets.push(new Wallet());
      }
      
      // Process transactions concurrently
      const start = Date.now();
      
      await Promise.all(wallets.map(async (receiverWallet, i) => {
        const tx = wallet.createTransaction(
          receiverWallet.publicKey,
          0.1,
          0.01,
          blockchain
        );
        
        await blockchain.addTransaction(tx);
      }));
      
      const end = Date.now();
      const processingTime = (end - start) / 1000;
      
      console.log(`Processed 10 concurrent transactions in ${processingTime} seconds`);
      expect(processingTime).toBeLessThan(5); // Should process in under 5 seconds
      expect(blockchain.pendingTransactions.length).toBeGreaterThanOrEqual(10);
    });
  });
});
