const Wallet = require('../../blockchain/wallet');
const Transaction = require('../../blockchain/transaction');
const Blockchain = require('../../blockchain/blockchain');
const crypto = require('crypto');
const { EC } = require('elliptic');
const ec = new EC('secp256k1');

describe('Cryptography and Security Tests', () => {
  let wallet;
  let blockchain;
  
  beforeEach(() => {
    wallet = new Wallet();
    blockchain = new Blockchain();
  });
  
  describe('Key Generation and Management', () => {
    it('should generate a valid key pair', () => {
      expect(wallet.privateKey).toBeDefined();
      expect(wallet.publicKey).toBeDefined();
      
      // Verify the key is a valid elliptic curve key
      const keyPair = ec.keyFromPrivate(wallet.privateKey);
      const publicKey = keyPair.getPublic('hex');
      
      expect(publicKey).toBe(wallet.publicKey);
    });
    
    it('should secure private keys with encryption', () => {
      const password = 'securePassword123';
      const encryptedWallet = wallet.encrypt(password);
      
      expect(encryptedWallet).toBeDefined();
      expect(typeof encryptedWallet).toBe('string');
      
      // Encrypted wallet should not contain the original private key
      expect(encryptedWallet.includes(wallet.privateKey)).toBe(false);
      
      // Should be able to decrypt with the right password
      const decryptedWallet = Wallet.decrypt(encryptedWallet, password);
      expect(decryptedWallet.privateKey).toBe(wallet.privateKey);
      expect(decryptedWallet.publicKey).toBe(wallet.publicKey);
    });
    
    it('should not decrypt with wrong password', () => {
      const password = 'securePassword123';
      const wrongPassword = 'wrongPassword';
      const encryptedWallet = wallet.encrypt(password);
      
      try {
        Wallet.decrypt(encryptedWallet, wrongPassword);
        fail('Should have thrown an error for incorrect password');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
    
    it('should create different key pairs for different wallets', () => {
      const wallet2 = new Wallet();
      
      expect(wallet.privateKey).not.toBe(wallet2.privateKey);
      expect(wallet.publicKey).not.toBe(wallet2.publicKey);
    });
  });
  
  describe('Digital Signatures', () => {
    it('should create valid signatures for transactions', () => {
      const transaction = wallet.createTransaction(
        'recipient-address',
        50,
        1,
        blockchain
      );
      
      const signature = transaction.signature;
      expect(signature).toBeDefined();
      
      // Verify the signature is valid
      const isValid = transaction.verifySignature();
      expect(isValid).toBe(true);
    });
    
    it('should detect invalid signatures', () => {
      const transaction = wallet.createTransaction(
        'recipient-address',
        50,
        1,
        blockchain
      );
      
      // Tamper with the transaction
      transaction.amount = 100;
      
      const isValid = transaction.verifySignature();
      expect(isValid).toBe(false);
    });
    
    it('should prevent transaction replay', () => {
      const recipient = 'recipient-address';
      const amount = 50;
      const fee = 1;
      
      // Create a transaction
      const transaction1 = wallet.createTransaction(
        recipient,
        amount,
        fee,
        blockchain
      );
      
      // Create another transaction with the same parameters
      const transaction2 = wallet.createTransaction(
        recipient,
        amount,
        fee,
        blockchain
      );
      
      // Despite having the same parameters, they should have different IDs
      expect(transaction1.id).not.toBe(transaction2.id);
    });
  });
  
  describe('Data Encryption', () => {
    it('should encrypt and decrypt data symmetrically', () => {
      const originalData = 'sensitive information';
      const password = 'encryption-password';
      
      // Encrypt
      const encrypted = wallet.encryptData(originalData, password);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toEqual(originalData);
      
      // Decrypt
      const decrypted = wallet.decryptData(encrypted, password);
      expect(decrypted).toBe(originalData);
    });
    
    it('should not decrypt with wrong password', () => {
      const originalData = 'sensitive information';
      const password = 'encryption-password';
      const wrongPassword = 'wrong-password';
      
      const encrypted = wallet.encryptData(originalData, password);
      
      try {
        wallet.decryptData(encrypted, wrongPassword);
        fail('Should have thrown an error for incorrect password');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });
  
  describe('Multi-Signature Functionality', () => {
    it('should create a multi-signature transaction requiring multiple signatures', () => {
      const wallet2 = new Wallet();
      const wallet3 = new Wallet();
      
      const requiredSignatures = 2;
      const signers = [wallet.publicKey, wallet2.publicKey, wallet3.publicKey];
      
      // Create a multi-sig transaction
      const multiSigTx = wallet.createMultiSigTransaction(
        'recipient-address',
        50,
        1,
        blockchain,
        signers,
        requiredSignatures
      );
      
      expect(multiSigTx).toBeDefined();
      expect(multiSigTx.signers).toEqual(signers);
      expect(multiSigTx.requiredSignatures).toBe(requiredSignatures);
      expect(multiSigTx.signatures).toHaveLength(1); // Only the creator has signed initially
      
      // Add second signature
      multiSigTx.addSignature(wallet2.privateKey);
      expect(multiSigTx.signatures).toHaveLength(2);
      
      // Transaction should now be valid (2 of 3 signatures)
      expect(multiSigTx.isFullySigned()).toBe(true);
      
      // Blockchain should accept this transaction
      const canAdd = blockchain.canAddTransaction(multiSigTx);
      expect(canAdd).toBe(true);
    });
    
    it('should reject multi-sig transactions with insufficient signatures', () => {
      const wallet2 = new Wallet();
      const wallet3 = new Wallet();
      
      const requiredSignatures = 3; // All three must sign
      const signers = [wallet.publicKey, wallet2.publicKey, wallet3.publicKey];
      
      const multiSigTx = wallet.createMultiSigTransaction(
        'recipient-address',
        50,
        1,
        blockchain,
        signers,
        requiredSignatures
      );
      
      // Add second signature, still not enough
      multiSigTx.addSignature(wallet2.privateKey);
      
      expect(multiSigTx.signatures).toHaveLength(2);
      expect(multiSigTx.isFullySigned()).toBe(false);
      
      // Blockchain should reject this transaction
      const canAdd = blockchain.canAddTransaction(multiSigTx);
      expect(canAdd).toBe(false);
    });
  });
});
