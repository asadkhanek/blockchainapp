const puppeteer = require('puppeteer');

// Normally these would be in a .env file
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test123!';

describe('User Interface Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
      defaultViewport: { width: 1280, height: 800 }
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  });

  afterEach(async () => {
    await page.close();
  });
  
  describe('Responsive Design', () => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1280, height: 800, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      it(`should display correctly on ${viewport.name} screens`, async () => {
        await page.setViewport({ width: viewport.width, height: viewport.height });
        await page.goto(`${APP_URL}`, { waitUntil: 'networkidle0' });
        
        // Check for the presence of key elements
        const navbarVisible = await page.evaluate(() => {
          const navbar = document.querySelector('nav');
          if (!navbar) return false;
          
          const style = window.getComputedStyle(navbar);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        
        expect(navbarVisible).toBe(true);
        
        // Check if hamburger menu is displayed on mobile
        if (viewport.name === 'mobile') {
          const hamburgerVisible = await page.evaluate(() => {
            const hamburger = document.querySelector('.hamburger, .mobile-menu-button');
            return hamburger && window.getComputedStyle(hamburger).display !== 'none';
          });
          
          expect(hamburgerVisible).toBe(true);
        }
      });
    }
  });
  
  describe('Navigation', () => {
    it('should navigate between pages correctly', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      
      // Click on login link
      await page.click('a[href="/login"]');
      await page.waitForSelector('#login-form', { visible: true });
      
      const loginUrl = await page.url();
      expect(loginUrl).toContain('/login');
      
      // Go back to home
      await page.click('a[href="/"]');
      await page.waitForSelector('main', { visible: true });
      
      const homeUrl = await page.url();
      expect(homeUrl).toBe(`${APP_URL}/`);
    });
    
    it('should show active navigation state', async () => {
      await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle0' });
      
      // Check if login link has active class
      const isLoginActive = await page.evaluate(() => {
        const loginLink = document.querySelector('a[href="/login"]');
        return loginLink && (
          loginLink.classList.contains('active') || 
          loginLink.getAttribute('aria-current') === 'page'
        );
      });
      
      expect(isLoginActive).toBe(true);
    });
  });
  
  describe('Form Validation', () => {
    it('should validate required fields on login form', async () => {
      await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle0' });
      
      // Submit empty form
      await page.click('button[type="submit"]');
      
      // Check for validation messages
      const validationMessages = await page.evaluate(() => {
        const emailInput = document.querySelector('input[type="email"]');
        const passwordInput = document.querySelector('input[type="password"]');
        
        return {
          email: emailInput.validationMessage,
          password: passwordInput.validationMessage
        };
      });
      
      expect(validationMessages.email).not.toBe('');
      expect(validationMessages.password).not.toBe('');
    });
    
    it('should show error message for invalid credentials', async () => {
      await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle0' });
      
      // Fill form with invalid credentials
      await page.type('input[name="email"]', 'invalid@example.com');
      await page.type('input[name="password"]', 'wrongpassword');
      
      // Submit form
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForResponse(response => response.url().includes('/api/auth/login'))
      ]);
      
      // Check for error message
      const errorVisible = await page.evaluate(() => {
        const errorElement = document.querySelector('.error-message, .alert-error');
        return errorElement && window.getComputedStyle(errorElement).display !== 'none';
      });
      
      expect(errorVisible).toBe(true);
    });
  });
  
  describe('Dashboard Interface', () => {
    beforeEach(async () => {
      // Login first
      await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle0' });
      await page.type('input[name="email"]', TEST_USER_EMAIL);
      await page.type('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    });
    
    it('should display wallet balance and transaction history', async () => {
      await page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle0' });
      
      // Check for wallet balance display
      const balanceElement = await page.$('.wallet-balance, .balance-display');
      expect(balanceElement).not.toBeNull();
      
      // Check for transaction history
      const transactionsElement = await page.$('.transaction-history, .recent-transactions');
      expect(transactionsElement).not.toBeNull();
    });
    
    it('should have working wallet creation button', async () => {
      await page.goto(`${APP_URL}/wallet`, { waitUntil: 'networkidle0' });
      
      // Click create wallet button if it exists
      const createButton = await page.$('button:has-text("Create Wallet"), button:has-text("New Wallet")');
      
      if (createButton) {
        await createButton.click();
        
        // Wait for wallet creation modal or confirmation
        await page.waitForSelector('.wallet-created, .create-wallet-form, .wallet-confirmation', {
          visible: true,
          timeout: 5000
        }).catch(() => {}); // Ignore timeout if wallet already exists
        
        // Verify either wallet was created or already exists
        const walletVisible = await page.evaluate(() => {
          return !!document.querySelector('.wallet-address, .wallet-details');
        });
        
        expect(walletVisible).toBe(true);
      } else {
        // If button doesn't exist, wallet should already be visible
        const walletVisible = await page.evaluate(() => {
          return !!document.querySelector('.wallet-address, .wallet-details');
        });
        
        expect(walletVisible).toBe(true);
      }
    });
  });
  
  describe('Dark Mode / Light Mode', () => {
    it('should toggle between dark and light modes', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      
      // Check if theme toggle exists
      const themeToggle = await page.$('.theme-toggle, button[aria-label="Toggle theme"]');
      
      if (themeToggle) {
        // Get initial background color
        const initialBg = await page.evaluate(() => {
          return window.getComputedStyle(document.body).backgroundColor;
        });
        
        // Click theme toggle
        await themeToggle.click();
        
        // Wait for transition
        await page.waitForTimeout(500);
        
        // Get new background color
        const newBg = await page.evaluate(() => {
          return window.getComputedStyle(document.body).backgroundColor;
        });
        
        // Colors should be different
        expect(newBg).not.toBe(initialBg);
      }
    });
  });
});
