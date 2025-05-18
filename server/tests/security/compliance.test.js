const supertest = require('supertest');
const app = require('../../app');
const User = require('../../models/user');
const { generateJwtToken } = require('../../utils/auth');

const request = supertest(app);

describe('Compliance Tests', () => {
  let token;
  let userId;

  beforeEach(async () => {
    // Create test user
    const user = new User({
      username: 'complianceuser',
      email: 'compliance@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '1234567890',
      country: 'United States',
      acceptedTerms: true,
      acceptedPrivacyPolicy: true,
      marketingConsent: false
    });
    
    await user.save();
    userId = user._id;
    token = generateJwtToken(userId);
  });

  describe('GDPR Compliance', () => {
    it('should provide access to all user data (right of access)', async () => {
      const response = await request
        .get('/api/user/data')
        .set('Authorization', `Bearer ${token}`);
        
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.userData).toBeDefined();
      
      // Check that all required data is included
      expect(response.body.userData).toHaveProperty('personalData');
      expect(response.body.userData).toHaveProperty('wallets');
      expect(response.body.userData).toHaveProperty('transactions');
      expect(response.body.userData).toHaveProperty('contracts');
      expect(response.body.userData).toHaveProperty('loginHistory');
      
      // Check that sensitive data is properly returned
      expect(response.body.userData.personalData).toHaveProperty('email');
      expect(response.body.userData.personalData).toHaveProperty('username');
      
      // Ensure password is NOT included
      expect(response.body.userData.personalData).not.toHaveProperty('password');
    });
    
    it('should allow users to download their data in machine-readable format', async () => {
      const response = await request
        .get('/api/user/data/export')
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'application/json');
        
      expect(response.status).toBe(200);
      expect(response.header['content-type']).toContain('application/json');
      expect(response.header['content-disposition']).toContain('attachment');
      
      // Verify data structure
      const data = response.body;
      expect(data).toHaveProperty('userData');
      expect(data.userData).toHaveProperty('personalData');
    });
    
    it('should allow users to correct their personal data (right to rectification)', async () => {
      const updatedData = {
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '9876543210',
        country: 'Canada'
      };
      
      const response = await request
        .put('/api/user/update')
        .set('Authorization', `Bearer ${token}`)
        .send(updatedData);
        
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.firstName).toBe(updatedData.firstName);
      expect(response.body.user.lastName).toBe(updatedData.lastName);
      expect(response.body.user.country).toBe(updatedData.country);
      
      // Verify in database
      const updatedUser = await User.findById(userId);
      expect(updatedUser.firstName).toBe(updatedData.firstName);
    });
    
    it('should allow users to delete their account (right to erasure)', async () => {
      const response = await request
        .delete('/api/user/delete')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'Password123!' }); // Require password for security
        
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
      
      // Verify user no longer exists in database
      const deletedUser = await User.findById(userId);
      expect(deletedUser).toBeNull();
    });
    
    it('should allow users to export their data (right to data portability)', async () => {
      const response = await request
        .get('/api/user/data/export')
        .set('Authorization', `Bearer ${token}`);
        
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userData');
      
      // Check that exported data is in a structured format
      expect(typeof response.body).toBe('object');
    });
  });

  describe('CCPA Compliance', () => {
    it('should allow California residents to opt-out of data sharing', async () => {
      // Update user to be from California
      await User.findByIdAndUpdate(userId, { 
        state: 'California',
        country: 'United States'
      });
      
      const response = await request
        .put('/api/user/privacy-settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          doNotSellMyData: true
        });
        
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.privacySettings.doNotSellMyData).toBe(true);
      
      // Verify in database
      const updatedUser = await User.findById(userId);
      expect(updatedUser.privacySettings.doNotSellMyData).toBe(true);
    });
    
    it('should have a "Do Not Sell My Personal Information" link in the footer for California IP addresses', async () => {
      const response = await request
        .get('/api/app/footer-content')
        .set('X-Forwarded-For', '192.168.1.1, 8.8.8.8, 157.131.0.1'); // California IP
        
      expect(response.status).toBe(200);
      expect(response.body.links.some(link => 
        link.url.includes('/do-not-sell') || 
        link.text.includes('Do Not Sell')
      )).toBe(true);
    });
  });
    
  describe('Consent Management', () => {
    it('should allow users to revoke marketing consent', async () => {
      // First give consent
      await User.findByIdAndUpdate(userId, { marketingConsent: true });
      
      const response = await request
        .put('/api/user/consent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          marketingConsent: false
        });
        
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.marketingConsent).toBe(false);
      
      // Verify in database
      const updatedUser = await User.findById(userId);
      expect(updatedUser.marketingConsent).toBe(false);
    });
    
    it('should record consent timestamps for audit purposes', async () => {
      const response = await request
        .put('/api/user/consent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          marketingConsent: true
        });
        
      expect(response.status).toBe(200);
      expect(response.body.user.consentHistory).toBeDefined();
      expect(response.body.user.consentHistory.length).toBeGreaterThan(0);
      
      const lastConsent = response.body.user.consentHistory[0];
      expect(lastConsent.consentType).toBe('marketing');
      expect(lastConsent.given).toBe(true);
      expect(lastConsent.timestamp).toBeDefined();
    });
  });
  
  describe('Cookie and Privacy Notices', () => {
    it('should provide privacy policy to users', async () => {
      const response = await request.get('/api/legal/privacy-policy');
        
      expect(response.status).toBe(200);
      expect(response.body.policy).toBeDefined();
      expect(response.body.lastUpdated).toBeDefined();
    });
    
    it('should provide cookie policy to users', async () => {
      const response = await request.get('/api/legal/cookie-policy');
        
      expect(response.status).toBe(200);
      expect(response.body.policy).toBeDefined();
      expect(response.body.cookieCategories).toBeDefined();
    });
  });
});
