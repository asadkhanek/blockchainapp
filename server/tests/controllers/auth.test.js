const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../models/User');
const app = require('../../index');
const jwt = require('jsonwebtoken');
const config = require('../../../config/config');

describe('Auth Controller Tests', () => {
  // Test data
  const validUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User'
  };
  
  const invalidUsers = {
    shortPassword: {
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'short', // Too short
      firstName: 'Test',
      lastName: 'User'
    },
    invalidEmail: {
      username: 'testuser3',
      email: 'notanemail', // Invalid email
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User'
    },
    duplicateUsername: {
      username: 'testuser', // Duplicate
      email: 'unique@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User'
    }
  };
  
  // Create a test token for auth tests
  const createTestToken = (user) => {
    return jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '1h' });
  };
  
  let testToken;
  
  // Before all tests, create a user for login tests
  beforeAll(async () => {
    await User.deleteMany({});
    const user = new User(validUser);
    await user.save();
  });

  // User Registration Tests
  describe('User Registration', () => {
    it('should register a new user with valid data', async () => {
      const newUser = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User'
      };
      
      const res = await request(app)
        .post('/api/auth/register')
        .send(newUser);
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('username', newUser.username);
      expect(res.body.user).toHaveProperty('email', newUser.email);
      expect(res.body.user).not.toHaveProperty('password'); // Password should not be returned
    });
    
    it('should not register a user with an existing username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(invalidUsers.duplicateUsername);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('msg');
      expect(res.body.msg).toMatch(/already exists/i);
    });
    
    it('should not register a user with an invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(invalidUsers.invalidEmail);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
    
    it('should not register a user with a short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(invalidUsers.shortPassword);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  // Login Tests
  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('username', validUser.username);
      
      // Save token for other tests
      testToken = res.body.token;
    });
    
    it('should not login with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: validUser.password
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('msg');
      expect(res.body.msg).toMatch(/invalid credentials/i);
    });
    
    it('should not login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: 'wrongpassword'
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('msg');
      expect(res.body.msg).toMatch(/invalid credentials/i);
    });
  });

  // Password Recovery Tests
  describe('Password Recovery', () => {
    it('should send password reset email for valid user', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: validUser.email });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('msg');
      expect(res.body.msg).toMatch(/sent/i);
    });
    
    it('should not send reset email for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });
      
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('msg');
      expect(res.body.msg).toMatch(/not found/i);
    });
    
    // Note: Testing actual reset requires a valid token which we'd need to extract from DB
    // This would be part of integration tests
  });

  // 2FA Tests
  describe('Two-Factor Authentication', () => {
    it('should enable 2FA for a valid user', async () => {
      // Get authenticated user first
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password
        });
        
      const token = loginRes.body.token;
      
      // Enable 2FA
      const res = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${token}`)
        .send({ method: 'authenticator' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('secret');
      expect(res.body).toHaveProperty('qrCode');
    });
    
    // Other 2FA tests would require actual verification codes
    // These would be covered in integration tests
  });

  // Role Assignment Tests
  describe('Role Assignment', () => {
    // This requires admin credentials - we'll mock this
    it('should allow admin to change user roles', async () => {
      // Create an admin user
      const adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'AdminPass123!',
        role: 'admin'
      });
      await adminUser.save();
      
      // Login as admin
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123!'
        });
      
      const adminToken = loginRes.body.token;
      
      // Get user to change
      const user = await User.findOne({ username: 'testuser' });
      
      // Update user role
      const res = await request(app)
        .put(`/api/users/${user.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'miner' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty('role', 'miner');
      
      // Verify the role was updated
      const updatedUser = await User.findById(user.id);
      expect(updatedUser.role).toBe('miner');
    });
    
    it('should not allow regular users to change roles', async () => {
      const user = await User.findOne({ username: 'testuser' });
      
      // Try to update role with non-admin token
      const res = await request(app)
        .put(`/api/users/${user.id}/role`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ role: 'admin' });
      
      expect(res.statusCode).toBe(403);
    });
  });
});
