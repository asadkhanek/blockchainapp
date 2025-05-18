module.exports = {
  // The root of your source code, typically /src
  roots: ["<rootDir>/src"],

  // Jest transformations -- this adds support for TypeScript
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest"
  },

  // Test spec file resolution pattern
  testMatch: ["**/tests/**/*.test.js", "**/tests/**/*.test.jsx", "**/tests/**/*.test.ts", "**/tests/**/*.test.tsx"],

  // Module file extensions for importing
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

  // Setup files after environment is set up
  setupFilesAfterEnv: ["<rootDir>/src/tests/setupTests.js"],

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/tests/**",
    "!src/serviceWorker.js",
    "!src/index.js"
  ],

  // Coverage directory
  coverageDirectory: "coverage",

  // Coverage thresholds
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60
    }
  },

  // Mock files
  moduleNameMapper: {
    "\\.(css|less|sass|scss)$": "<rootDir>/src/tests/__mocks__/styleMock.js",
    "\\.(gif|ttf|eot|svg|png|jpg|jpeg)$": "<rootDir>/src/tests/__mocks__/fileMock.js"
  },

  // Test environment options
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "http://localhost"
  },

  // Verbosity of test output
  verbose: true,

  // Automatically clear mock calls between tests
  clearMocks: true
};
