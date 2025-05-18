const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../index');
const User = require('../../models/User');
const Contract = require('../../models/Contract');
const Wallet = require('../../blockchain/wallet');
const Blockchain = require('../../blockchain/blockchain');

describe('End-to-End Integration Tests', () => {
  // Test users
  const testUser = {
    username: 'integrationuser',
    email: 'integration@example.com',
    password: 'Integration123!'
  };
  
  const adminUser = {
    username: 'integrationadmin',
    email: 'integrationadmin@example.com',
    password: 'AdminPass123!',
    role: 'admin'
  };
  
  // Auth tokens
  let userToken;
  let adminToken;
  let userId;
  
  // Created entities
  let walletId;
  let contractId;
  let transactionId;
  
  // Sample contract code
  const simpleStorageCode = `
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
  
  beforeAll(async () => {
    // Create test users
    // Regular user via API
    const userRes = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    userToken = userRes.body.token;
    userId = userRes.body.user.id;
    
    // Admin user directly in database
    const admin = new User(adminUser);
    await admin.save();
    
    // Login as admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminUser.email,
        password: adminUser.password
      });
    
    adminToken = adminLogin.body.token;
  });
  
  describe('Complete User Journey', () => {
    it('should create a wallet for the user', async () => {
      const res = await request(app)
        .post('/api/wallets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Integration Test Wallet' });
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('address');
      expect(res.body).toHaveProperty('name', 'Integration Test Wallet');
      
      walletId = res.body.id;
    });
    
    it('should generate a QR code for the wallet address', async () => {
      const res = await request(app)
        .get(`/api/wallets/${walletId}/qrcode`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('qrCode');
    });
    
    it('should deploy a smart contract', async () => {
      const contractData = {
        name: 'Integration Test Contract',
        code: simpleStorageCode,
        initialBalance: 0,
        description: 'A contract for integration testing'
      };
      
      const res = await request(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(contractData);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id');
      
      contractId = res.body.id;
    });
    
    it('should execute a contract method', async () => {
      const setValue = 100;
      const execution = {
        method: 'set',
        args: [setValue]
      };
      
      const setRes = await request(app)
        .post(`/api/contracts/${contractId}/execute`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(execution);
      
      expect(setRes.statusCode).toBe(200);
      expect(setRes.body).toHaveProperty('success', true);
      
      // Verify the value was set
      const getExecution = {
        method: 'get',
        args: []
      };
      
      const getRes = await request(app)
        .post(`/api/contracts/${contractId}/execute`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(getExecution);
      
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toHaveProperty('result', setValue.toString());
    });
    
    it('should create a transaction', async () => {
      // Create a blockchain instance to add some funds to our user
      const blockchain = new Blockchain();
      
      // Get user's wallet address
      const walletsRes = await request(app)
        .get('/api/wallets')
        .set('Authorization', `Bearer ${userToken}`);
      
      const userAddress = walletsRes.body[0].address;
      
      // Mine a block to generate funds with the user's address
      await blockchain.mineBlock(userAddress);
      
      // Now create a transaction
      const txData = {
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        amount: 1,
        fee: 0.1,
        memo: 'Integration test transaction'
      };
      
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(txData);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('from');
      expect(res.body).toHaveProperty('to', txData.recipientAddress);
      expect(parseFloat(res.body.amount)).toBe(txData.amount);
      
      transactionId = res.body.id;
    });
    
    it('should get transaction history', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      // Should find our created transaction
      const foundTx = res.body.find(tx => tx.id === transactionId);
      expect(foundTx).toBeDefined();
    });
    
    it('should get transaction details', async () => {
      const res = await request(app)
        .get(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', transactionId);
    });
    
    it('should get blockchain explorer data', async () => {
      const res = await request(app)
        .get('/api/blockchain')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('blocks');
      expect(Array.isArray(res.body.blocks)).toBe(true);
      expect(res.body).toHaveProperty('stats');
    });
    
    it('should get specific block details', async () => {
      // First get the blockchain
      const blockchainRes = await request(app)
        .get('/api/blockchain')
        .set('Authorization', `Bearer ${userToken}`);
      
      // Get the most recent block
      const lastBlock = blockchainRes.body.blocks[0];
      
      // Get details for this block
      const res = await request(app)
        .get(`/api/blockchain/block/${lastBlock.hash}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('hash', lastBlock.hash);
      expect(res.body).toHaveProperty('transactions');
    });
    
    it('should view admin dashboard as admin', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('blockchainStats');
      expect(res.body).toHaveProperty('userStats');
      expect(res.body).toHaveProperty('transactionStats');
      expect(res.body).toHaveProperty('contractStats');
    });
    
    it('should update user profile', async () => {
      const profileUpdates = {
        firstName: 'Integration',
        lastName: 'Tester',
        profilePicture: 'https://example.com/profile.jpg'
      };
      
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(profileUpdates);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('firstName', profileUpdates.firstName);
      expect(res.body).toHaveProperty('lastName', profileUpdates.lastName);
      expect(res.body).toHaveProperty('profilePicture', profileUpdates.profilePicture);
    });
    
    it('should change user password', async () => {
      const passwordData = {
        currentPassword: testUser.password,
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      };
      
      const res = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('msg');
      
      // Test login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: passwordData.newPassword
        });
      
      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body).toHaveProperty('token');
      
      // Update token for further tests
      userToken = loginRes.body.token;
    });
  });
  
  describe('Complete Admin Journey', () => {
    it('should get users as admin', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(Array.isArray(res.body.users)).toBe(true);
      
      // Should find our test user
      const foundUser = res.body.users.find(u => u.email === testUser.email);
      expect(foundUser).toBeDefined();
    });
    
    it('should change user role as admin', async () => {
      const res = await request(app)
        .put(`/api/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'miner' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty('role', 'miner');
    });
    
    it('should get system logs as admin', async () => {
      const res = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('logs');
    });
    
    it('should create system backup as admin', async () => {
      const res = await request(app)
        .post('/api/admin/system/backup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          includeBlocks: true,
          includeTransactions: true,
          includeWallets: true
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('backupFile');
    });
    
    it('should get network status as admin', async () => {
      const res = await request(app)
        .get('/api/admin/network')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('networkStatus');
      expect(res.body).toHaveProperty('peers');
    });
  });
});
