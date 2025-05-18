const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../models/User');
const app = require('../../index');
const jwt = require('jsonwebtoken');
const config = require('../../../config/config');
const Blockchain = require('../../blockchain/blockchain');
const Wallet = require('../../blockchain/wallet');
const fs = require('fs').promises;
const path = require('path');

describe('Admin Panel Tests', () => {
  // Test admin user
  const adminUser = {
    username: 'testadmin',
    email: 'admin@example.com',
    password: 'AdminPass123!',
    role: 'admin'
  };
  
  // Regular user
  const regularUser = {
    username: 'regularuser',
    email: 'regular@example.com',
    password: 'UserPass123!'
  };
  
  // Tokens
  let adminToken;
  let userToken;
  
  // Setup test users
  beforeAll(async () => {
    // Create admin user directly in database to set role
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
    
    // Create regular user via API
    const userRes = await request(app)
      .post('/api/auth/register')
      .send(regularUser);
    
    userToken = userRes.body.token;
  });
  
  describe('Access Control', () => {
    it('should allow admin to access admin dashboard', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('blockchainStats');
      expect(res.body).toHaveProperty('userStats');
    });
    
    it('should deny regular users access to admin dashboard', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(403);
    });
    
    it('should deny unauthenticated users access to admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard');
      
      expect(res.statusCode).toBe(401);
    });
  });
  
  describe('User Management', () => {
    it('should get all users with pagination and filtering', async () => {
      // First create a few more users
      for (let i = 1; i <= 5; i++) {
        await User.create({
          username: `testuser${i}`,
          email: `testuser${i}@example.com`,
          password: 'Password123!'
        });
      }
      
      // Get users with pagination
      const res = await request(app)
        .get('/api/admin/users')
        .query({ limit: 3, page: 1 })
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.users).toHaveLength(3);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(7); // 1 admin, 1 regular, 5 test users
    });
    
    it('should filter users by role', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .query({ role: 'admin' })
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(res.body.users.length).toBeGreaterThanOrEqual(1);
      
      // All returned users should be admins
      res.body.users.forEach(user => {
        expect(user.role).toBe('admin');
      });
    });
    
    it('should search users by keyword', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .query({ search: 'testadmin' })
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(res.body.users.length).toBeGreaterThanOrEqual(1);
      
      // The search should find our admin user
      const foundAdmin = res.body.users.some(user => 
        user.username === adminUser.username
      );
      
      expect(foundAdmin).toBe(true);
    });
  });
  
  describe('Transaction Management', () => {
    beforeAll(async () => {
      // Create some transactions by mining blocks
      const blockchain = new Blockchain();
      const wallet = new Wallet();
      
      // Mine a few blocks
      await blockchain.mineBlock(wallet.publicKey);
      await blockchain.mineBlock(wallet.publicKey);
      
      // Create a transaction
      const transaction = wallet.createTransaction(
        'recipient-address',
        50,
        1,
        blockchain
      );
      
      await blockchain.addTransaction(transaction);
      await blockchain.mineBlock(wallet.publicKey);
    });
    
    it('should get all transactions with pagination', async () => {
      const res = await request(app)
        .get('/api/admin/transactions')
        .query({ limit: 10, page: 1 })
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('transactions');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.transactions)).toBe(true);
    });
    
    it('should filter transactions by type', async () => {
      const res = await request(app)
        .get('/api/admin/transactions')
        .query({ type: 'mining' })
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('transactions');
      
      // All returned transactions should be mining type
      res.body.transactions.forEach(tx => {
        expect(tx.type).toBe('mining');
      });
    });
    
    it('should filter transactions by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const res = await request(app)
        .get('/api/admin/transactions')
        .query({
          fromDate: yesterday.toISOString(),
          toDate: today.toISOString()
        })
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('transactions');
      
      // All returned transactions should be within date range
      res.body.transactions.forEach(tx => {
        const txDate = new Date(tx.timestamp);
        expect(txDate >= yesterday).toBe(true);
        expect(txDate <= today).toBe(true);
      });
    });
  });
  
  describe('Network Management', () => {
    it('should get network status', async () => {
      const res = await request(app)
        .get('/api/admin/network')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('networkStatus');
      expect(res.body).toHaveProperty('peers');
      expect(res.body).toHaveProperty('nodeStats');
    });
    
    it('should add a peer to the network', async () => {
      const peerData = {
        peerUrl: 'localhost',
        peerPort: 7001
      };
      
      const res = await request(app)
        .post('/api/admin/network/peers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(peerData);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('peer');
    });
    
    it('should remove a peer from the network', async () => {
      // First get peers to find ID
      const peersRes = await request(app)
        .get('/api/admin/network')
        .set('Authorization', `Bearer ${adminToken}`);
      
      // If we have peers
      if (peersRes.body.peers && peersRes.body.peers.length > 0) {
        const peerId = peersRes.body.peers[0].id;
        
        const res = await request(app)
          .delete(`/api/admin/network/peers/${peerId}`)
          .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      } else {
        // Skip test if no peers
        console.log('No peers to remove, skipping test');
      }
    });
  });
  
  describe('System Management', () => {
    it('should get system logs', async () => {
      const res = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('logs');
      expect(res.body).toHaveProperty('pagination');
    });
    
    it('should create system backup', async () => {
      const backupOptions = {
        includeBlocks: true,
        includeTransactions: true,
        includeWallets: true
      };
      
      const res = await request(app)
        .post('/api/admin/system/backup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(backupOptions);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('backupFile');
      expect(res.body).toHaveProperty('timestamp');
      
      // Store backupFile for restore test
      global.backupFilePath = res.body.backupFile;
    });
    
    it('should restore from backup', async () => {
      // Skip if no backup file
      if (!global.backupFilePath) {
        console.log('No backup file, skipping restore test');
        return;
      }
      
      const res = await request(app)
        .post('/api/admin/system/restore')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ backupFile: global.backupFilePath });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('details');
    });
  });
});
