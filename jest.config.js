module.exports = {
  // The test environment that will be used for testing
  testEnvironment: 'node',
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // An array of regexp pattern strings that are matched against all test paths
  // matched tests are skipped
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  
  // A list of paths to directories that Jest should use to search for files in
  roots: [
    '<rootDir>/server'
  ],
  
  // Setup files after environment is set up
  setupFilesAfterEnv: [
    '<rootDir>/server/tests/setup.js'
  ],
  
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  
  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'v8',
  
  // An array of glob patterns indicating a set of files for which coverage 
  // information should be collected
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/tests/**'
  ],
  
  // The maximum amount of workers used to run your tests
  maxWorkers: '50%',
  
  // An object that configures minimum threshold enforcement for coverage results
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70
    }
  },
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
    // Run tests with different configurations
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/server/tests/models/**/*.test.js',
        '<rootDir>/server/tests/blockchain/**/*.test.js',
        '<rootDir>/server/tests/security/**/*.test.js'
      ]
    },
    {
      displayName: 'controllers',
      testMatch: [
        '<rootDir>/server/tests/controllers/**/*.test.js'
      ]
    },
    {
      displayName: 'integration',
      testMatch: [
        '<rootDir>/server/tests/integration/**/*.test.js'
      ]
    },
    {
      displayName: 'performance',
      testMatch: [
        '<rootDir>/server/tests/performance/**/*.test.js'
      ]
    },
    {
      displayName: 'security',
      testMatch: [
        '<rootDir>/server/tests/security/**/*.test.js'
      ]
    },
    {
      displayName: 'usability',
      testMatch: [
        '<rootDir>/server/tests/usability/**/*.test.js'
      ]
    },
    {
      displayName: 'deployment',
      testMatch: [
        '<rootDir>/server/tests/deployment/**/*.test.js'
      ]
    }
  ]
};
