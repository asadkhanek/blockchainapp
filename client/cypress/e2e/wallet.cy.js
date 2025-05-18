describe('Wallet Functionality', () => {
  beforeEach(() => {
    // Mock successful login before each test
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Set local storage to include auth token
    cy.window().then(win => {
      win.localStorage.setItem('token', 'fake-jwt-token');
    });
    
    // Mock user data endpoint
    cy.intercept('GET', '/api/user', {
      statusCode: 200,
      body: {
        success: true,
        user: {
          id: '123',
          username: 'testuser',
          email: 'test@example.com'
        }
      }
    });
    
    // Visit the dashboard page
    cy.visit('/dashboard');
  });
  
  it('should display wallet list when available', () => {
    // Mock wallet API response
    cy.intercept('GET', '/api/wallet', {
      statusCode: 200,
      body: {
        success: true,
        wallets: [
          {
            id: 'wallet1',
            name: 'Main Wallet',
            address: '0x1234567890abcdef1234567890abcdef12345678',
            balance: '10.5'
          },
          {
            id: 'wallet2',
            name: 'Savings Wallet',
            address: '0xabcdef1234567890abcdef1234567890abcdef12',
            balance: '25.75'
          }
        ]
      }
    });
    
    // Navigate to wallet page
    cy.contains('Wallets').click();
    
    // Verify wallet list is displayed
    cy.contains('Main Wallet').should('exist');
    cy.contains('Savings Wallet').should('exist');
    cy.contains('10.5').should('exist');
    cy.contains('25.75').should('exist');
  });
  
  it('should display create wallet form', () => {
    // Mock empty wallet response
    cy.intercept('GET', '/api/wallet', {
      statusCode: 200,
      body: {
        success: true,
        wallets: []
      }
    });
    
    // Navigate to wallet page
    cy.contains('Wallets').click();
    
    // Check for create wallet button
    cy.contains('Create Wallet').click();
    
    // Verify create wallet form is shown
    cy.get('form').should('exist');
    cy.get('input[name="walletName"]').should('exist');
    cy.get('button').contains(/create|generate/i).should('exist');
  });
  
  it('should successfully create a new wallet', () => {
    // Mock wallet creation API
    cy.intercept('POST', '/api/wallet', {
      statusCode: 200,
      body: {
        success: true,
        wallet: {
          id: 'new-wallet',
          name: 'New Test Wallet',
          address: '0xnewtestwallet1234567890abcdef1234567890',
          balance: '0'
        },
        privateKey: '0xprivatekeyfornewwallet12345'
      }
    }).as('createWallet');
    
    // Mock get wallets API
    cy.intercept('GET', '/api/wallet', {
      statusCode: 200,
      body: {
        success: true,
        wallets: []
      }
    });
    
    // Navigate to wallet page
    cy.contains('Wallets').click();
    
    // Click create wallet button
    cy.contains('Create Wallet').click();
    
    // Fill out form
    cy.get('input[name="walletName"]').type('New Test Wallet');
    
    // Submit form
    cy.contains(/create|generate/i).click();
    
    // Wait for API call to complete
    cy.wait('@createWallet');
    
    // Verify success message and private key display
    cy.contains(/wallet created|creation successful/i).should('exist');
    cy.contains('0xprivatekeyfornewwallet12345').should('exist');
    
    // Verify backup warning message
    cy.contains(/backup|save|store.*private key/i).should('exist');
  });
  
  it('should display transaction history for a wallet', () => {
    // Mock wallet API response
    cy.intercept('GET', '/api/wallet', {
      statusCode: 200,
      body: {
        success: true,
        wallets: [
          {
            id: 'wallet1',
            name: 'Main Wallet',
            address: '0x1234567890abcdef1234567890abcdef12345678',
            balance: '10.5'
          }
        ]
      }
    });
    
    // Mock transaction history API
    cy.intercept('GET', '/api/wallet/wallet1/transactions', {
      statusCode: 200,
      body: {
        success: true,
        transactions: [
          {
            id: 'tx1',
            from: '0xsender1234567890abcdef1234567890abcdef',
            to: '0x1234567890abcdef1234567890abcdef12345678',
            amount: '5.25',
            fee: '0.001',
            status: 'confirmed',
            timestamp: new Date().toISOString()
          },
          {
            id: 'tx2',
            from: '0x1234567890abcdef1234567890abcdef12345678',
            to: '0xrecipient1234567890abcdef1234567890ab',
            amount: '1.5',
            fee: '0.001',
            status: 'confirmed',
            timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
          }
        ]
      }
    });
    
    // Navigate to wallet page
    cy.contains('Wallets').click();
    
    // Click on wallet to see details
    cy.contains('Main Wallet').click();
    
    // Verify transaction history
    cy.contains('Transaction History').should('exist');
    cy.contains('5.25').should('exist'); // First transaction amount
    cy.contains('1.5').should('exist');  // Second transaction amount
  });
  
  it('should allow sending a transaction', () => {
    // Mock wallet API response
    cy.intercept('GET', '/api/wallet', {
      statusCode: 200,
      body: {
        success: true,
        wallets: [
          {
            id: 'wallet1',
            name: 'Main Wallet',
            address: '0x1234567890abcdef1234567890abcdef12345678',
            balance: '10.5'
          }
        ]
      }
    });
    
    // Mock fee estimation API
    cy.intercept('GET', '/api/wallet/estimate-fee*', {
      statusCode: 200,
      body: {
        success: true,
        estimatedFee: '0.001'
      }
    });
    
    // Mock send transaction API
    cy.intercept('POST', '/api/wallet/*/send', {
      statusCode: 200,
      body: {
        success: true,
        transaction: {
          id: 'newtx',
          from: '0x1234567890abcdef1234567890abcdef12345678',
          to: '0xrecipient1234567890abcdef1234567890ab',
          amount: '2.5',
          fee: '0.001',
          status: 'pending',
          timestamp: new Date().toISOString()
        }
      }
    }).as('sendTransaction');
    
    // Navigate to wallet page
    cy.contains('Wallets').click();
    
    // Click on wallet to see details
    cy.contains('Main Wallet').click();
    
    // Click send button
    cy.contains(/send|transfer/i).click();
    
    // Fill out transaction form
    cy.get('input[name="recipient"]').type('0xrecipient1234567890abcdef1234567890ab');
    cy.get('input[name="amount"]').type('2.5');
    
    // Submit form
    cy.contains(/send|confirm/i).click();
    
    // Wait for API call to complete
    cy.wait('@sendTransaction');
    
    // Verify success message
    cy.contains(/transaction sent|transfer successful/i).should('exist');
  });
});
