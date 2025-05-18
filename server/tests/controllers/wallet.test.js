const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../models/User');
const app = require('../../index');
const jwt = require('jsonwebtoken');
const config = require('../../../config/config');
const Wallet = require('../../blockchain/wallet');

describe('Wallet Management Tests', () => {
  // Test user
  const testUser = {
    username: 'walletuser',
    email: 'wallet@example.com',
    password: 'Password123!'
  };
  
  // Auth token
  let authToken;
  let userId;
  
  // Create user and get token
  beforeAll(async () => {
    // Create a test user
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    authToken = res.body.token;
    userId = res.body.user.id;
  });
  
  describe('Wallet Creation and Management', () => {
    let walletId;
    
    it('should create a new wallet', async () => {
      const walletData = {
        name: 'Test Wallet'
      };
      
      const res = await request(app)
        .post('/api/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData);
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('address');
      expect(res.body).toHaveProperty('name', walletData.name);
      
      walletId = res.body.id;
    });
    
    it('should get all user wallets', async () => {
      const res = await request(app)
        .get('/api/wallets')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('id');
    });
    
    it('should get a specific wallet by ID', async () => {
      const res = await request(app)
        .get(`/api/wallets/${walletId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', walletId);
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('address');
    });
    
    it('should update wallet name', async () => {
      const updatedName = 'Updated Wallet Name';
      
      const res = await request(app)
        .put(`/api/wallets/${walletId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: updatedName });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('name', updatedName);
      expect(res.body).toHaveProperty('id', walletId);
    });
    
    it('should not allow access to other users wallets', async () => {
      // Create another user
      const otherUser = {
        username: 'otheruser',
        email: 'other@example.com',
        password: 'Password123!'
      };
      
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(otherUser);
      
      const otherToken = registerRes.body.token;
      
      // Try to access the first user's wallet
      const res = await request(app)
        .get(`/api/wallets/${walletId}`)
        .set('Authorization', `Bearer ${otherToken}`);
      
      expect(res.statusCode).toBe(403);
    });
  });
  
  describe('Wallet Backup and Restore', () => {
    it('should create a wallet backup', async () => {
      const res = await request(app)
        .post('/api/wallets/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: 'BackupPassword123!' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('backup');
      expect(typeof res.body.backup).toBe('string');
      
      // Store backup for restore test
      global.backupData = res.body.backup;
    });
    
    it('should restore wallet from backup', async () => {
      // Create a new user for restore test
      const restoreUser = {
        username: 'restoreuser',
        email: 'restore@example.com',
        password: 'Password123!'
      };
      
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(restoreUser);
      
      const restoreToken = registerRes.body.token;
      
      // Restore wallet
      const res = await request(app)
        .post('/api/wallets/restore')
        .set('Authorization', `Bearer ${restoreToken}`)
        .send({
          backup: global.backupData,
          password: 'BackupPassword123!',
          name: 'Restored Wallet'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'Restored Wallet');
    });
    
    it('should not restore with incorrect password', async () => {
      const res = await request(app)
        .post('/api/wallets/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          backup: global.backupData,
          password: 'WrongPassword',
          name: 'Failed Restore'
        });
      
      expect(res.statusCode).toBe(400);
    });
  });
  
  describe('QR Code Generation', () => {
    it('should generate QR code for wallet address', async () => {
      // Get user's first wallet
      const walletsRes = await request(app)
        .get('/api/wallets')
        .set('Authorization', `Bearer ${authToken}`);
      
      const walletId = walletsRes.body[0].id;
      
      // Generate QR code
      const res = await request(app)
        .get(`/api/wallets/${walletId}/qrcode`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('qrCode');
      expect(typeof res.body.qrCode).toBe('string');
    });
  });
  
  describe('Transaction Fee Calculation', () => {
    it('should calculate transaction fee', async () => {
      const amount = 100;
      
      const res = await request(app)
        .get('/api/transactions/calculate-fee')
        .query({ amount })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('fee');
      expect(typeof res.body.fee).toBe('number');
      expect(res.body.fee).toBeGreaterThan(0);
    });
    
    it('should calculate minimum fee for small transactions', async () => {
      const amount = 0.1;
      
      const res = await request(app)
        .get('/api/transactions/calculate-fee')
        .query({ amount })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('fee');
      expect(typeof res.body.fee).toBe('number');
      expect(res.body.fee).toBeGreaterThan(0);
    });
    
    it('should adjust fee for custom amounts', async () => {
      const amount = 50;
      const customFee = 2;
      
      const res = await request(app)
        .get('/api/transactions/calculate-fee')
        .query({ amount, customFee })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('fee');
      expect(res.body.fee).toBeGreaterThanOrEqual(customFee);
    });
  });
});
