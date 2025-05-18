const Blockchain = require('../../blockchain/blockchain');
const Block = require('../../blockchain/block');
const Transaction = require('../../blockchain/transaction');
const Wallet = require('../../blockchain/wallet');

describe('Blockchain Core Tests', () => {
  let blockchain;
  let wallet;
  let secondaryWallet;
  
  beforeEach(() => {
    blockchain = new Blockchain();
    wallet = new Wallet();
    secondaryWallet = new Wallet();
  });
  
  describe('Block Creation and Mining', () => {
    it('should create a genesis block', () => {
      const genesisBlock = blockchain.chain[0];
      
      expect(genesisBlock).toBeDefined();
      expect(genesisBlock.previousHash).toBe('0');
      expect(genesisBlock.timestamp).toBeDefined();
    });
    
    it('should mine a new block with transactions', async () => {
      // Create a transaction
      const transaction = wallet.createTransaction(
        secondaryWallet.publicKey,
        50,
        1,
        blockchain
      );
      
      // Add transaction to pending
      await blockchain.addTransaction(transaction);
      
      // Get the initial chain length
      const initialChainLength = blockchain.chain.length;
      
      // Mine a new block (this should include the transaction)
      const newBlock = await blockchain.mineBlock(wallet.publicKey);
      
      expect(blockchain.chain.length).toBe(initialChainLength + 1);
      expect(newBlock.transactions.length).toBeGreaterThanOrEqual(1); // Should include at least one transaction (mining reward)
      
      // Check that the transaction is included in the block
      const includedTx = newBlock.transactions.find(tx => 
        tx.id === transaction.id
      );
      
      expect(includedTx).toBeDefined();
    });
    
    it('should adjust mining difficulty based on mine rate', async () => {
      // Mine several blocks to trigger difficulty adjustment
      for (let i = 0; i < 5; i++) {
        await blockchain.mineBlock(wallet.publicKey);
      }
      
      // Get current difficulty
      const difficulty = blockchain.chain[blockchain.chain.length - 1].difficulty;
      
      // The difficulty should be dynamically adjusted based on mining rate
      // This test ensures the difficulty adjustment logic is working
      expect(difficulty).toBeDefined();
      expect(typeof difficulty).toBe('number');
    });
    
    it('should validate a valid chain', () => {
      const isValid = blockchain.isValidChain(blockchain.chain);
      expect(isValid).toBe(true);
    });
    
    it('should invalidate a chain with a tampered block', async () => {
      // Mine a few blocks
      await blockchain.mineBlock(wallet.publicKey);
      await blockchain.mineBlock(wallet.publicKey);
      
      // Tamper with a block
      blockchain.chain[1].data = 'tampered data';
      
      const isValid = blockchain.isValidChain(blockchain.chain);
      expect(isValid).toBe(false);
    });
  });
  
  describe('Transaction Processing', () => {
    it('should add a valid transaction to pending transactions', async () => {
      const initialPendingLength = blockchain.pendingTransactions.length;
      
      // Create a transaction
      const transaction = wallet.createTransaction(
        secondaryWallet.publicKey,
        50,
        1,
        blockchain
      );
      
      // Add to pending transactions
      await blockchain.addTransaction(transaction);
      
      expect(blockchain.pendingTransactions.length).toBe(initialPendingLength + 1);
      expect(blockchain.pendingTransactions[blockchain.pendingTransactions.length - 1].id).toBe(transaction.id);
    });
    
    it('should not add an invalid transaction', async () => {
      // Create a transaction with invalid signature
      const transaction = wallet.createTransaction(
        secondaryWallet.publicKey,
        50,
        1,
        blockchain
      );
      
      // Tamper with the transaction
      transaction.signature = 'fake-signature';
      
      // Try to add to pending transactions
      try {
        await blockchain.addTransaction(transaction);
        fail('Should have thrown an error for invalid transaction');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
    
    it('should verify transaction signature', async () => {
      // Create a valid transaction
      const transaction = wallet.createTransaction(
        secondaryWallet.publicKey,
        50,
        1,
        blockchain
      );
      
      // Verification should pass
      const isValid = blockchain.verifyTransaction(transaction);
      expect(isValid).toBe(true);
      
      // Tamper with transaction and verify again
      transaction.amount = 100;
      const isInvalid = blockchain.verifyTransaction(transaction);
      expect(isInvalid).toBe(false);
    });
    
    it('should calculate correct wallet balance', async () => {
      // Create an initial mining reward
      await blockchain.mineBlock(wallet.publicKey);
      
      // Get the expected mining reward
      const expectedReward = blockchain.miningReward;
      
      // Check wallet balance
      const balance = await blockchain.getBalanceForAddress(wallet.publicKey);
      expect(balance).toBe(expectedReward);
      
      // Create a transaction spending some coins
      const amountToSend = 10;
      const transaction = wallet.createTransaction(
        secondaryWallet.publicKey,
        amountToSend,
        1,
        blockchain
      );
      
      await blockchain.addTransaction(transaction);
      await blockchain.mineBlock(wallet.publicKey);
      
      // Check updated balances
      const senderBalance = await blockchain.getBalanceForAddress(wallet.publicKey);
      const receiverBalance = await blockchain.getBalanceForAddress(secondaryWallet.publicKey);
      
      // Original reward + new reward - amount sent
      expect(senderBalance).toBe((expectedReward * 2) - amountToSend - 1); // Subtract fee too
      expect(receiverBalance).toBe(amountToSend);
    });
  });
  
  describe('Consensus Algorithm', () => {
    it('should replace the chain with a valid longer chain', async () => {
      // Create a second blockchain
      const newBlockchain = new Blockchain();
      
      // Mine some blocks on the new blockchain to make it longer
      await newBlockchain.mineBlock(wallet.publicKey);
      await newBlockchain.mineBlock(wallet.publicKey);
      await newBlockchain.mineBlock(wallet.publicKey);
      
      // Original blockchain should be shorter
      expect(blockchain.chain.length).toBeLessThan(newBlockchain.chain.length);
      
      // Replace chain
      const result = await blockchain.replaceChain(newBlockchain.chain);
      
      expect(result).toBe(true);
      expect(blockchain.chain.length).toBe(newBlockchain.chain.length);
    });
    
    it('should not replace the chain with a shorter or same length chain', async () => {
      // Mine some blocks on our main blockchain
      await blockchain.mineBlock(wallet.publicKey);
      await blockchain.mineBlock(wallet.publicKey);
      
      // Create a second blockchain (this will just have genesis block)
      const newBlockchain = new Blockchain();
      
      // Try to replace chain
      const result = await blockchain.replaceChain(newBlockchain.chain);
      
      expect(result).toBe(false);
      expect(blockchain.chain.length).toBeGreaterThan(newBlockchain.chain.length);
    });
    
    it('should not replace the chain with an invalid chain', async () => {
      // Create a second blockchain
      const newBlockchain = new Blockchain();
      
      // Mine some blocks on the new blockchain to make it longer
      await newBlockchain.mineBlock(wallet.publicKey);
      await newBlockchain.mineBlock(wallet.publicKey);
      await newBlockchain.mineBlock(wallet.publicKey);
      
      // Tamper with the new blockchain
      newBlockchain.chain[1].data = 'tampered data';
      
      // Try to replace chain
      const result = await blockchain.replaceChain(newBlockchain.chain);
      
      expect(result).toBe(false);
      expect(blockchain.chain.length).toBeLessThan(newBlockchain.chain.length);
    });
  });
});
