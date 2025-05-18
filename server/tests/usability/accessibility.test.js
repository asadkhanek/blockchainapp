const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('axe-puppeteer');
const { toHaveNoViolations } = require('jest-axe');

expect.extend(toHaveNoViolations);

// Normally these would be in a .env file
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test123!';

describe('Accessibility Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    // Launch browser for testing
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    // Set up a fresh tab
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Public Pages', () => {
    it('should pass accessibility checks for homepage', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      const results = await new AxePuppeteer(page).analyze();
      expect(results).toHaveNoViolations();
    });

    it('should pass accessibility checks for login page', async () => {
      await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle0' });
      const results = await new AxePuppeteer(page).analyze();
      expect(results).toHaveNoViolations();
    });

    it('should pass accessibility checks for registration page', async () => {
      await page.goto(`${APP_URL}/register`, { waitUntil: 'networkidle0' });
      const results = await new AxePuppeteer(page).analyze();
      expect(results).toHaveNoViolations();
    });
  });

  describe('Authenticated Pages', () => {
    beforeEach(async () => {
      // Login first
      await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle0' });
      await page.type('input[name="email"]', TEST_USER_EMAIL);
      await page.type('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    });

    it('should pass accessibility checks for dashboard', async () => {
      await page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle0' });
      const results = await new AxePuppeteer(page).analyze();
      expect(results).toHaveNoViolations();
    });

    it('should pass accessibility checks for wallet page', async () => {
      await page.goto(`${APP_URL}/wallet`, { waitUntil: 'networkidle0' });
      const results = await new AxePuppeteer(page).analyze();
      expect(results).toHaveNoViolations();
    });

    it('should pass accessibility checks for transactions page', async () => {
      await page.goto(`${APP_URL}/transactions`, { waitUntil: 'networkidle0' });
      const results = await new AxePuppeteer(page).analyze();
      expect(results).toHaveNoViolations();
    });

    it('should pass accessibility checks for smart contracts page', async () => {
      await page.goto(`${APP_URL}/contracts`, { waitUntil: 'networkidle0' });
      const results = await new AxePuppeteer(page).analyze();
      expect(results).toHaveNoViolations();
    });
  });

  describe('Color Contrast and Screen Reader Support', () => {
    it('should have adequate color contrast on all pages', async () => {
      const pages = [
        '/',
        '/login',
        '/register',
        '/about',
        '/contact'
      ];

      for (const path of pages) {
        await page.goto(`${APP_URL}${path}`, { waitUntil: 'networkidle0' });
        const results = await new AxePuppeteer(page).analyze();
        const contrastIssues = results.violations.filter(
          violation => violation.id === 'color-contrast'
        );
        expect(contrastIssues).toHaveLength(0);
      }
    });

    it('should have proper ARIA attributes for screen readers', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      const results = await new AxePuppeteer(page).analyze();
      
      // Check for ARIA related violations
      const ariaIssues = results.violations.filter(
        violation => violation.id.includes('aria')
      );
      expect(ariaIssues).toHaveLength(0);
    });
  });
});
