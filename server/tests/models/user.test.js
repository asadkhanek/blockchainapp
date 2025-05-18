const mongoose = require('mongoose');
const User = require('../../models/User');

describe('User Model Test', () => {
  let testUser;

  beforeEach(async () => {
    testUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };
  });

  it('should create & save a user successfully', async () => {
    const user = new User(testUser);
    const savedUser = await user.save();
    
    // Object Id should be defined
    expect(savedUser._id).toBeDefined();
    expect(savedUser.username).toBe(testUser.username);
    expect(savedUser.email).toBe(testUser.email);
    expect(savedUser.firstName).toBe(testUser.firstName);
    expect(savedUser.lastName).toBe(testUser.lastName);
    
    // Password should be hashed
    expect(savedUser.password).not.toBe(testUser.password);
    
    // Default fields should be set
    expect(savedUser.role).toBe('user');
    expect(savedUser.isEmailVerified).toBe(false);
    expect(savedUser.wallets).toHaveLength(0);
    expect(savedUser.createdAt).toBeDefined();
  });

  it('should fail validation when username is empty', async () => {
    const userWithoutUsername = new User({ ...testUser, username: '' });
    let err;
    
    try {
      await userWithoutUsername.save();
    } catch (error) {
      err = error;
    }
    
    expect(err).toBeDefined();
    expect(err.errors.username).toBeDefined();
  });

  it('should fail validation when email is empty', async () => {
    const userWithoutEmail = new User({ ...testUser, email: '' });
    let err;
    
    try {
      await userWithoutEmail.save();
    } catch (error) {
      err = error;
    }
    
    expect(err).toBeDefined();
    expect(err.errors.email).toBeDefined();
  });

  it('should fail validation when password is too short', async () => {
    const userWithShortPassword = new User({ ...testUser, password: 'short' });
    let err;
    
    try {
      await userWithShortPassword.save();
    } catch (error) {
      err = error;
    }
    
    expect(err).toBeDefined();
    expect(err.errors.password).toBeDefined();
  });

  it('should correctly compare passwords', async () => {
    const user = new User(testUser);
    await user.save();
    
    // Compare with correct password
    const isMatch = await user.comparePassword(testUser.password);
    expect(isMatch).toBe(true);
    
    // Compare with incorrect password
    const isNotMatch = await user.comparePassword('wrongpassword');
    expect(isNotMatch).toBe(false);
  });

  it('should generate email verification token', async () => {
    const user = new User(testUser);
    const token = user.generateEmailVerificationToken();
    
    expect(token).toBeDefined();
    expect(user.emailVerificationToken).toBeDefined();
    expect(user.emailVerificationExpires).toBeDefined();
  });

  it('should generate reset password token', async () => {
    const user = new User(testUser);
    const token = user.generateResetPasswordToken();
    
    expect(token).toBeDefined();
    expect(user.resetPasswordToken).toBeDefined();
    expect(user.resetPasswordExpires).toBeDefined();
  });

  it('should add wallet to user', async () => {
    const user = new User(testUser);
    await user.save();
    
    const walletData = {
      id: 'wallet1',
      name: 'Test Wallet',
      address: '0x123456789',
      encryptedData: 'encrypted-data'
    };
    
    const addedWallet = user.addWallet(walletData);
    await user.save();
    
    expect(addedWallet).toBeDefined();
    expect(user.wallets).toHaveLength(1);
    expect(user.wallets[0].id).toBe(walletData.id);
    expect(user.wallets[0].name).toBe(walletData.name);
    expect(user.wallets[0].address).toBe(walletData.address);
    expect(user.wallets[0].isDefault).toBe(true); // First wallet should be default
  });

  it('should set default wallet', async () => {
    const user = new User(testUser);
    await user.save();
    
    // Add two wallets
    const wallet1 = user.addWallet({
      id: 'wallet1',
      name: 'Wallet 1',
      address: '0x111111111'
    });
    
    const wallet2 = user.addWallet({
      id: 'wallet2',
      name: 'Wallet 2',
      address: '0x222222222'
    });
    
    await user.save();
    
    // Wallet1 should be default initially
    expect(user.wallets[0].isDefault).toBe(true);
    expect(user.wallets[1].isDefault).toBe(false);
    
    // Change default to wallet2
    user.setDefaultWallet('wallet2');
    await user.save();
    
    expect(user.wallets[0].isDefault).toBe(false);
    expect(user.wallets[1].isDefault).toBe(true);
  });
});
