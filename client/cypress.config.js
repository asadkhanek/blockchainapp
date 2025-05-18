const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  
  viewportWidth: 1280,
  viewportHeight: 720,
  
  // Retry options for flaky tests
  retries: {
    runMode: 2,
    openMode: 0
  },
  
  // Default command timeout
  defaultCommandTimeout: 5000,
  
  screenshotOnRunFailure: true,
  video: true,
  
  env: {
    apiUrl: 'http://localhost:5000',
  }
});
