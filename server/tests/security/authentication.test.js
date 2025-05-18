const request = require('supertest');
const app = require('../../index');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const config = require('../../../config/config');

describe('Authentication Security Tests', () => {
  // Test user
  const testUser = {
    username: 'securityuser',
    email: 'security@example.com',
    password: 'SecurePass123!'
  };
  
  // Create a user for tests
  beforeAll(async () => {
    await User.deleteMany({ email: testUser.email });
    
    // Create test user
    await request(app)
      .post('/api/auth/register')
      .send(testUser);
  });
  
  describe('Password Security', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'short',                 // Too short
        'password',              // Common password
        '12345678',              // Only numbers
        'abcdefgh',              // Only lowercase
        'ABCDEFGH',              // Only uppercase
        'Password'               // No number/special char
      ];
      
      for (const password of weakPasswords) {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            username: `test${password}`,
            email: `${password}@example.com`,
            password: password
          });
        
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
      }
    });
    
    it('should store passwords as hashes, not plaintext', async () => {
      // Get the user from database
      const user = await User.findOne({ email: testUser.email });
      
      expect(user).toBeDefined();
      expect(user.password).not.toBe(testUser.password);
      expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
    });
  });
  
  describe('JWT Security', () => {
    let userToken;
    
    beforeAll(async () => {
      // Login to get token
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      userToken = res.body.token;
    });
    
    it('should issue a valid JWT token on login', async () => {
      expect(userToken).toBeDefined();
      
      // Verify token structure
      const tokenParts = userToken.split('.');
      expect(tokenParts).toHaveLength(3); // Header, payload, signature
      
      // Decode payload
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      
      expect(payload).toHaveProperty('id');
      expect(payload).toHaveProperty('exp'); // Expiration
      expect(payload).toHaveProperty('iat'); // Issued at
      
      // Verify expiration is set properly
      const expirationTime = payload.exp - payload.iat;
      const oneDayInSeconds = 24 * 60 * 60;
      expect(expirationTime).toBeGreaterThanOrEqual(oneDayInSeconds - 60); // Allow for slight timing differences
    });
    
    it('should reject expired tokens', async () => {
      // Create an expired token by changing expiration
      const user = await User.findOne({ email: testUser.email });
      
      const expiredToken = jwt.sign(
        { id: user.id },
        config.jwtSecret,
        { expiresIn: '0s' } // Expires immediately
      );
      
      // Try to access protected route
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(res.statusCode).toBe(401);
    });
    
    it('should reject tampered tokens', async () => {
      // Tamper with the payload of a valid token
      const tokenParts = userToken.split('.');
      
      // Decode payload
      let payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      
      // Modify payload
      payload.role = 'admin'; // Try to escalate privileges
      
      // Re-encode payload
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      
      // Reassemble token with tampered payload
      const tamperedToken = `${tokenParts[0]}.${tamperedPayload}.${tokenParts[2]}`;
      
      // Try to access protected route
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tamperedToken}`);
      
      expect(res.statusCode).toBe(401);
    });
  });
  
  describe('Authorization Checks', () => {
    let userToken;
    let userId;
    
    beforeAll(async () => {
      // Login to get token
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      userToken = res.body.token;
      
      // Get user ID
      const user = await User.findOne({ email: testUser.email });
      userId = user.id;
      
      // Create a second user for testing resource isolation
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'OtherPass123!'
        });
    });
    
    it('should deny access to admin routes for regular users', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(403);
    });
    
    it('should prevent accessing other users\' resources', async () => {
      // Create a wallet for first user
      const walletRes = await request(app)
        .post('/api/wallets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Security Test Wallet' });
      
      const walletId = walletRes.body.id;
      
      // Login as second user
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'OtherPass123!'
        });
      
      const otherToken = loginRes.body.token;
      
      // Try to access first user's wallet
      const accessRes = await request(app)
        .get(`/api/wallets/${walletId}`)
        .set('Authorization', `Bearer ${otherToken}`);
      
      expect(accessRes.statusCode).toBe(403);
    });
    
    it('should verify user ownership before updates', async () => {
      // Create a wallet for first user
      const walletRes = await request(app)
        .post('/api/wallets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Security Update Wallet' });
      
      const walletId = walletRes.body.id;
      
      // Login as second user
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'OtherPass123!'
        });
      
      const otherToken = loginRes.body.token;
      
      // Try to update first user's wallet
      const updateRes = await request(app)
        .put(`/api/wallets/${walletId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Wallet' });
      
      expect(updateRes.statusCode).toBe(403);
    });
  });
});
