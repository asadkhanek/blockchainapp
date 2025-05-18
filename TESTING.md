# Blockchain Web Application Testing

This document provides an overview of the testing infrastructure for the Blockchain Web Application.

## Testing Overview

The testing infrastructure covers all aspects of the application, including:

- **Unit Tests**: Testing individual components and functions
- **Integration Tests**: Testing interactions between components
- **End-to-End Tests**: Testing complete user flows
- **Performance Tests**: Ensuring the application meets performance requirements
- **Security Tests**: Validating security measures and identifying vulnerabilities
- **Usability Tests**: Ensuring the application is user-friendly
- **Compliance Tests**: Validating GDPR and CCPA compliance
- **Deployment Tests**: Ensuring proper deployment configurations

## Running Tests

The following commands are available to run various test suites:

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit           # Unit tests
npm run test:controllers    # Controller tests
npm run test:integration    # Integration tests
npm run test:performance    # Performance tests
npm run test:security       # Security tests
npm run test:usability      # UI and Accessibility tests
npm run test:compliance     # GDPR and CCPA compliance tests
npm run test:deployment     # Deployment configuration tests

# More specific test categories
npm run test:notifications  # Notification system tests
npm run test:ui             # User interface tests
npm run test:accessibility  # Accessibility tests

# Run tests with coverage report
npm run test:coverage

# Generate comprehensive test report
npm run test:report
```

## Test Report

The test reporting system generates comprehensive reports including:

- Overall test coverage metrics
- Coverage by category
- Detailed coverage by file
- Threshold status

To generate a report:

```bash
npm run test:report
```

This will create HTML and JSON reports in the `test-reports` directory.

## Continuous Integration

The project includes a CI/CD pipeline configured with GitHub Actions that:

1. Runs all tests on pull requests
2. Generates coverage reports
3. Builds and deploys the application on successful tests
4. Provides test feedback on pull requests

The CI workflow is defined in `.github/workflows/ci.yml`.

## Test Structure

```
server/tests/
├── blockchain/            # Blockchain core tests
│   └── blockchain.test.js
├── controllers/           # API controller tests
│   ├── admin.test.js
│   ├── auth.test.js
│   ├── contract.test.js
│   ├── notifications.test.js
│   └── wallet.test.js
├── deployment/            # Deployment configuration tests
│   └── deployment.test.js
├── integration/           # Integration tests
│   └── end-to-end.test.js
├── models/                # Data model tests
│   └── user.test.js
├── performance/           # Performance tests
│   └── performance.test.js
├── security/              # Security tests
│   ├── authentication.test.js
│   ├── compliance.test.js
│   ├── cryptography.test.js
│   ├── input-validation.test.js
│   └── rate-limiting.test.js
├── usability/             # UI and accessibility tests
│   ├── accessibility.test.js
│   └── user-interface.test.js
└── setup.js              # Test setup file
```

## Coverage Thresholds

The project has the following coverage thresholds:

- Statements: 70%
- Branches: 60%
- Functions: 70%
- Lines: 70%

These thresholds ensure a minimum level of test coverage across the codebase.
