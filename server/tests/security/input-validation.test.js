const request = require('supertest');
const app = require('../../index');
const User = require('../../models/User');

describe('Input Validation Security Tests', () => {
  // Test user for authentication
  const testUser = {
    username: 'inputvalidation',
    email: 'inputvalidation@example.com',
    password: 'SecurePass123!'
  };
  
  // Auth token
  let authToken;
  
  beforeAll(async () => {
    // Create test user
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    authToken = res.body.token;
  });
  
  describe('SQL Injection Prevention', () => {
    it('should handle SQL injection attempts in query parameters', async () => {
      const sqlInjectionAttempts = [
        "' OR '1'='1",
        "; DROP TABLE users;",
        "' UNION SELECT * FROM users--",
        "admin'--",
        "1; SELECT * FROM information_schema.tables"
      ];
      
      for (const injection of sqlInjectionAttempts) {
        const res = await request(app)
          .get(`/api/users?search=${injection}`)
          .set('Authorization', `Bearer ${authToken}`);
        
        // Should not crash the server
        expect(res.statusCode).not.toBe(500);
      }
    });
    
    it('should handle SQL injection attempts in request bodies', async () => {
      const sqlInjectionAttempts = [
        "' OR '1'='1",
        "; DROP TABLE users;",
        "' UNION SELECT * FROM users--"
      ];
      
      for (const injection of sqlInjectionAttempts) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: injection,
            password: injection
          });
        
        // Should not crash the server and should not authenticate
        expect(res.statusCode).not.toBe(500);
        expect(res.statusCode).not.toBe(200);
      }
    });
  });
  
  describe('XSS Prevention', () => {
    it('should sanitize input to prevent XSS attacks', async () => {
      const xssPayloads = [
        "<script>alert('XSS')</script>",
        "<img src='x' onerror='alert(\"XSS\")'>",
        "<a href='javascript:alert(\"XSS\")'>Click me</a>"
      ];
      
      // Test XSS in profile update
      for (const xssPayload of xssPayloads) {
        const res = await request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: xssPayload,
            lastName: xssPayload
          });
        
        // Should accept the request but sanitize the input
        expect(res.statusCode).toBe(200);
        
        // Check if the XSS payload was sanitized
        if (res.body.firstName) {
          expect(res.body.firstName).not.toBe(xssPayload);
          expect(res.body.firstName).not.toContain('<script>');
        }
        
        if (res.body.lastName) {
          expect(res.body.lastName).not.toBe(xssPayload);
          expect(res.body.lastName).not.toContain('<script>');
        }
      }
    });
    
    it('should escape HTML in wallet names', async () => {
      const xssPayload = "<script>alert('XSS')</script>";
      
      const res = await request(app)
        .post('/api/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: xssPayload });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.name).not.toBe(xssPayload);
      expect(res.body.name).not.toContain('<script>');
    });
  });
  
  describe('NoSQL Injection Prevention', () => {
    it('should prevent NoSQL injection in queries', async () => {
      const noSqlPayloads = [
        '{"$gt": ""}',
        '{"$ne": null}',
        '{"$where": "this.password == this.username"}'
      ];
      
      for (const payload of noSqlPayloads) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: payload
          });
        
        // Should not authenticate and should not crash
        expect(res.statusCode).not.toBe(500);
        expect(res.statusCode).not.toBe(200);
      }
    });
  });
  
  describe('Parameter Validation', () => {
    it('should validate wallet address format', async () => {
      const invalidAddresses = [
        'not-a-wallet',
        '0x12345',                // Too short
        '0xinvalidcharacters',
        '0x123456789012345678901234567890123456789012345678901234567890123456789' // Too long
      ];
      
      for (const invalidAddress of invalidAddresses) {
        const res = await request(app)
          .post('/api/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            recipientAddress: invalidAddress,
            amount: 1,
            fee: 0.1
          });
        
        expect(res.statusCode).toBe(400);
      }
    });
    
    it('should validate transaction amounts', async () => {
      const invalidAmounts = [
        -1,        // Negative amount
        0,         // Zero amount
        'abc',     // Non-numeric
        1e20,      // Too large
        null,      // Null value
        undefined  // Missing value
      ];
      
      for (const invalidAmount of invalidAmounts) {
        const res = await request(app)
          .post('/api/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            recipientAddress: '0x1234567890123456789012345678901234567890',
            amount: invalidAmount,
            fee: 0.1
          });
        
        expect(res.statusCode).toBe(400);
      }
    });
  });
  
  describe('Smart Contract Security', () => {
    it('should validate smart contract code for security issues', async () => {
      const vulnerableContracts = [
        // Reentrancy vulnerability
        `contract Vulnerable {
          mapping(address => uint) public balances;
          
          function withdraw() public {
            uint amount = balances[msg.sender];
            (bool success, ) = msg.sender.call{value: amount}("");
            balances[msg.sender] = 0;
          }
        }`,
        
        // Integer overflow
        `contract Overflow {
          mapping(address => uint8) public balances;
          
          function transfer(address to, uint8 amount) public {
            balances[msg.sender] -= amount;
            balances[to] += amount;
          }
        }`,
        
        // Timestamp dependency
        `contract TimestampDependence {
          function isLucky() public view returns(bool) {
            return block.timestamp % 15 == 0;
          }
        }`
      ];
      
      for (const vulnerableCode of vulnerableContracts) {
        const res = await request(app)
          .post('/api/contracts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Vulnerable Contract',
            code: vulnerableCode
          });
        
        // Should reject vulnerable contract code
        expect(res.statusCode).toBe(400);
      }
    });
  });
});
