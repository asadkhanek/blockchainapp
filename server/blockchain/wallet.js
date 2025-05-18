const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const { v4: uuidv4 } = require('uuid');
const CryptoJS = require('crypto-js');
const Transaction = require('./transaction');

class Wallet {
  constructor(privateKey = null) {
    this.id = uuidv4();
    this.keyPair = privateKey ? ec.keyFromPrivate(privateKey) : ec.genKeyPair();
    this.privateKey = this.keyPair.getPrivate('hex');
    this.publicKey = this.keyPair.getPublic('hex');
  }

  sign(dataHash) {
    return this.keyPair.sign(dataHash);
  }
  createTransaction(toAddress, amount, fee = 1, blockchain, memo = '') {
    // Get balance and validate amount
    const balance = blockchain.getBalanceOfAddress(this.publicKey);
    
    if (balance < amount + fee) {
      throw new Error('Not enough balance');
    }
    const transaction = new Transaction(this.publicKey, toAddress, amount, fee, memo);
    transaction.signTransaction(this.keyPair);
    
    return transaction;
  }

  getBalance(blockchain) {
    return blockchain.getBalanceOfAddress(this.publicKey);
  }

  getTransactionHistory(blockchain) {
    return blockchain.getTransactionsOfAddress(this.publicKey);
  }

  // Encrypt wallet with a password for secure storage
  encrypt(password) {
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify({
        privateKey: this.privateKey,
        publicKey: this.publicKey
      }),
      password
    ).toString();

    return {
      id: this.id,
      encryptedData: encryptedData
    };
  }

  // Static method to decrypt and load a wallet
  static decrypt(encryptedWallet, password) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedWallet.encryptedData, password);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      
      return new Wallet(decryptedData.privateKey);
    } catch (error) {
      throw new Error('Invalid password or corrupted wallet file');
    }
  }

  // Backup wallet to JSON
  toJSON() {
    return {
      id: this.id,
      publicKey: this.publicKey,
      privateKey: this.privateKey
    };
  }
}

module.exports = Wallet;
