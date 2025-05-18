const supertest = require('supertest');
const app = require('../../app');
const User = require('../../models/user');
const redis = require('redis-mock');
const rateLimit = require('../../middleware/rate-limit');

const request = supertest(app);

// Replace actual Redis client with mock for testing
jest.mock('redis', () => redis);

describe('Rate Limiting Functionality', () => {
  let authClient;

  beforeEach(() => {
    // Reset the mock rate limit counters
    rateLimit.resetForTest(); // Assuming there's a test helper function in middleware
    authClient = supertest(app);
  });

  describe('API Rate Limiting', () => {
    it('should allow requests under the rate limit', async () => {
      // Make requests up to the limit
      const requests = [];
      for (let i = 0; i < 5; i++) { // Assuming limit is 5 requests
        requests.push(authClient.post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123'
          }));
      }

      // Wait for all requests to complete
      const responses = await Promise.all(requests);
      
      // None of the responses should be rate limited
      for (const response of responses) {
        expect(response.status).not.toBe(429);
      }
    });

    it('should block requests exceeding the rate limit', async () => {
      // Make requests exceeding the limit
      const responses = [];
      for (let i = 0; i < 10; i++) { // Assuming limit is 5 requests
        const response = await authClient.post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123'
          });
        responses.push(response);
      }
      
      // Verify some responses were rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should include appropriate headers in rate-limited responses', async () => {
      // Make requests exceeding the limit
      let rateLimitedResponse;
      for (let i = 0; i < 10; i++) { // Assuming limit is 5 requests
        const response = await authClient.post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123'
          });
          
        if (response.status === 429) {
          rateLimitedResponse = response;
          break;
        }
      }
      
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.headers).toHaveProperty('retry-after');
      expect(rateLimitedResponse.body).toHaveProperty('message');
      expect(rateLimitedResponse.body.message).toContain('Too many requests');
    });
  });

  describe('IP-based Rate Limiting', () => {
    it('should limit requests based on IP address', async () => {
      // Make many requests from the same IP
      const responses = [];
      for (let i = 0; i < 15; i++) {
        const response = await authClient.get('/api/blockchain/status');
        responses.push(response);
      }
      
      // Verify some responses were rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('User-based Rate Limiting', () => {
    let token;
    
    beforeEach(async () => {
      // Create test user
      const user = new User({
        username: 'ratelimituser',
        email: 'ratelimit@example.com',
        password: 'Password123!'
      });
      await user.save();
      
      // Login to get token
      const response = await request
        .post('/api/auth/login')
        .send({
          email: 'ratelimit@example.com',
          password: 'Password123!'
        });
        
      token = response.body.token;
    });
    
    it('should limit sensitive operations by authenticated user', async () => {
      // Attempt multiple sensitive operations
      const responses = [];
      for (let i = 0; i < 15; i++) {
        const response = await request
          .post('/api/wallet/create')
          .set('Authorization', `Bearer ${token}`);
        responses.push(response);
      }
      
      // Verify some responses were rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Different Rate Limits for Different Endpoints', () => {
    it('should apply higher rate limits to public endpoints', async () => {
      // Make many requests to public endpoint
      const publicResponses = [];
      for (let i = 0; i < 15; i++) {
        const response = await authClient.get('/api/blockchain/stats');
        publicResponses.push(response);
      }
      
      // Count rate limited responses
      const publicRateLimited = publicResponses.filter(r => r.status === 429);
      
      // Now try sensitive endpoint
      const sensitiveResponses = [];
      for (let i = 0; i < 10; i++) {
        const response = await authClient.post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123'
          });
        sensitiveResponses.push(response);
      }
      
      // Count rate limited responses
      const sensitiveRateLimited = sensitiveResponses.filter(r => r.status === 429);
      
      // Sensitive endpoints should rate limit more aggressively
      expect(sensitiveRateLimited.length).toBeGreaterThan(publicRateLimited.length);
    });
  });
});
