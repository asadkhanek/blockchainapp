describe('Authentication Flow', () => {
  beforeEach(() => {
    // Reset any previous state
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Visit the home page
    cy.visit('/');
  });
  
  it('should navigate to login page', () => {
    // Find and click on the login link
    cy.get('a').contains(/login|sign in/i).click();
    
    // Verify that we are on the login page
    cy.url().should('include', '/login');
    cy.get('form').should('exist');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
  });
  
  it('should show validation errors for invalid inputs', () => {
    // Navigate to login page
    cy.get('a').contains(/login|sign in/i).click();
    
    // Submit empty form
    cy.get('button[type="submit"]').click();
    
    // Check for validation errors
    cy.get('form').contains(/required|cannot be empty/i).should('exist');
    
    // Fill in invalid email
    cy.get('input[type="email"]').type('invalidemail');
    cy.get('button[type="submit"]').click();
    
    // Check for email validation error
    cy.get('form').contains(/valid email/i).should('exist');
  });
  
  it('should display error for invalid credentials', () => {
    // Navigate to login page
    cy.get('a').contains(/login|sign in/i).click();
    
    // Fill in form with invalid credentials
    cy.get('input[type="email"]').type('invalid@example.com');
    cy.get('input[type="password"]').type('wrongpassword');
    
    // Submit form
    cy.get('button[type="submit"]').click();
    
    // Check for error message
    cy.contains(/invalid credentials|incorrect password/i).should('exist');
  });
  
  it('should navigate to registration page', () => {
    // Navigate to login page first
    cy.get('a').contains(/login|sign in/i).click();
    
    // Find and click on the register link
    cy.get('a').contains(/register|sign up|create account/i).click();
    
    // Verify that we are on the registration page
    cy.url().should('include', '/register');
    cy.get('form').should('exist');
    cy.get('input[name="username"]').should('exist');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
  });
  
  it('should validate password strength on registration', () => {
    // Navigate to registration page
    cy.get('a').contains(/login|sign in/i).click();
    cy.get('a').contains(/register|sign up|create account/i).click();
    
    // Fill in form with weak password
    cy.get('input[name="username"]').type('testuser');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('input[name="confirmPassword"]').type('password123');
    
    // Submit form
    cy.get('button[type="submit"]').click();
    
    // Check for password strength error
    cy.contains(/password.*requirements|stronger password/i).should('exist');
  });
  
  it('should successfully log in with valid mock credentials', () => {
    // Intercept API calls
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        token: 'fake-jwt-token',
        user: {
          id: '123',
          username: 'testuser',
          email: 'test@example.com'
        }
      }
    }).as('loginRequest');
    
    // Navigate to login page
    cy.get('a').contains(/login|sign in/i).click();
    
    // Fill in form with valid credentials
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('Password123!');
    
    // Submit form
    cy.get('button[type="submit"]').click();
    
    // Wait for API call
    cy.wait('@loginRequest');
    
    // Verify redirect to dashboard or home page
    cy.url().should('include', '/dashboard');
    
    // Verify user is logged in (e.g., by checking for user greeting)
    cy.contains(/welcome|hello|dashboard/i).should('exist');
  });
});
