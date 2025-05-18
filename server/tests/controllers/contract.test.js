const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Contract = require('../../models/Contract');
const app = require('../../index');
const Blockchain = require('../../blockchain/blockchain');
const SmartContract = require('../../blockchain/smartContract');
const Wallet = require('../../blockchain/wallet');

describe('Smart Contract Tests', () => {
  // Test user
  const testUser = {
    username: 'contractuser',
    email: 'contract@example.com',
    password: 'Password123!'
  };
  
  // Auth token and user ID
  let authToken;
  let userId;
  
  // Sample contract code
  const sampleContractCode = `
    contract SimpleStorage {
      uint256 private storedData;
      
      function set(uint256 x) public {
        storedData = x;
      }
      
      function get() public view returns (uint256) {
        return storedData;
      }
    }
  `;
  
  // Setup test user and get token
  beforeAll(async () => {
    // Create test user
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    authToken = res.body.token;
    userId = res.body.user.id;
    
    // Ensure user has a wallet
    await request(app)
      .post('/api/wallets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Contract Test Wallet' });
  });
  
  describe('Contract Deployment and Management', () => {
    let contractId;
    
    it('should deploy a new smart contract', async () => {
      const contractData = {
        name: 'Simple Storage Contract',
        code: sampleContractCode,
        initialBalance: 0,
        description: 'A simple storage contract for testing'
      };
      
      const res = await request(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contractData);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('address');
      expect(res.body).toHaveProperty('name', contractData.name);
      expect(res.body).toHaveProperty('owner');
      
      contractId = res.body.id;
    });
    
    it('should get all contracts', async () => {
      const res = await request(app)
        .get('/api/contracts')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('contracts');
      expect(Array.isArray(res.body.contracts)).toBe(true);
      expect(res.body.contracts.length).toBeGreaterThanOrEqual(1);
    });
    
    it('should get a specific contract by ID', async () => {
      const res = await request(app)
        .get(`/api/contracts/${contractId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', contractId);
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('code');
      expect(res.body).toHaveProperty('abi');
    });
    
    it('should get owner contracts', async () => {
      const res = await request(app)
        .get('/api/contracts/owner')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('owner');
    });
    
    it('should update contract metadata', async () => {
      const updates = {
        name: 'Updated Contract Name',
        description: 'Updated contract description',
        tags: ['test', 'storage']
      };
      
      const res = await request(app)
        .put(`/api/contracts/${contractId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('name', updates.name);
      expect(res.body).toHaveProperty('description', updates.description);
      expect(res.body).toHaveProperty('tags');
      expect(res.body.tags).toContain('test');
      expect(res.body.tags).toContain('storage');
    });
    
    it('should not allow other users to update the contract', async () => {
      // Create another user
      const otherUser = {
        username: 'othercontract',
        email: 'othercontract@example.com',
        password: 'Password123!'
      };
      
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(otherUser);
      
      const otherToken = registerRes.body.token;
      
      // Try to update the first user's contract
      const res = await request(app)
        .put(`/api/contracts/${contractId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Contract' });
      
      expect(res.statusCode).toBe(403);
    });
  });
  
  describe('Contract Execution', () => {
    let contractId;
    
    // Deploy a contract for execution tests
    beforeAll(async () => {
      const contractData = {
        name: 'Execution Test Contract',
        code: sampleContractCode,
        initialBalance: 0,
        description: 'A contract for testing execution'
      };
      
      const res = await request(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contractData);
      
      contractId = res.body.id;
    });
    
    it('should execute a contract method with no parameters', async () => {
      const execution = {
        method: 'get',
        args: []
      };
      
      const res = await request(app)
        .post(`/api/contracts/${contractId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(execution);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('result');
      expect(res.body).toHaveProperty('txHash');
    });
    
    it('should execute a contract method with parameters', async () => {
      const testValue = 42;
      const setExecution = {
        method: 'set',
        args: [testValue]
      };
      
      // First set the value
      const setRes = await request(app)
        .post(`/api/contracts/${contractId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(setExecution);
      
      expect(setRes.statusCode).toBe(200);
      
      // Then get the value to verify it was set
      const getExecution = {
        method: 'get',
        args: []
      };
      
      const getRes = await request(app)
        .post(`/api/contracts/${contractId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(getExecution);
      
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.result).toBe(testValue.toString());
    });
    
    it('should fail with invalid method name', async () => {
      const execution = {
        method: 'nonexistent',
        args: []
      };
      
      const res = await request(app)
        .post(`/api/contracts/${contractId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(execution);
      
      expect(res.statusCode).toBe(400);
    });
    
    it('should fail with invalid arguments', async () => {
      const execution = {
        method: 'set',
        args: ['not-a-number'] // Should be a number
      };
      
      const res = await request(app)
        .post(`/api/contracts/${contractId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(execution);
      
      expect(res.statusCode).toBe(400);
    });
  });
  
  describe('Contract with Funds', () => {
    let fundedContractId;
    
    // Sample contract that can receive and send funds
    const fundableContractCode = `
      contract Fundable {
        address public owner;
        
        constructor() {
          owner = msg.sender;
        }
        
        function getBalance() public view returns (uint256) {
          return address(this).balance;
        }
        
        function withdraw(uint256 amount) public {
          require(msg.sender == owner, "Only owner can withdraw");
          require(amount <= address(this).balance, "Insufficient funds");
          
          payable(owner).transfer(amount);
        }
        
        receive() external payable {}
      }
    `;
    
    // Deploy a contract with initial balance
    beforeAll(async () => {
      // First, ensure the user has some funds
      const blockchain = new Blockchain();
      const wallet = new Wallet(); // Test wallet
      
      // Mine some blocks to generate funds for test wallet
      await blockchain.mineBlock(wallet.publicKey);
      await blockchain.mineBlock(wallet.publicKey);
      
      // Now deploy the contract
      const contractData = {
        name: 'Fundable Test Contract',
        code: fundableContractCode,
        initialBalance: 10, // Send 10 coins to the contract
        description: 'A contract that can receive and send funds'
      };
      
      const res = await request(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contractData);
      
      fundedContractId = res.body.id;
    });
    
    it('should check contract balance', async () => {
      const execution = {
        method: 'getBalance',
        args: []
      };
      
      const res = await request(app)
        .post(`/api/contracts/${fundedContractId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(execution);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('result');
      expect(parseInt(res.body.result)).toBeGreaterThanOrEqual(10); // Should have at least initial balance
    });
    
    it('should transfer funds to a contract', async () => {
      const transferAmount = 5;
      const execution = {
        method: 'receive', // Using the receive function
        args: [],
        value: transferAmount // Sending additional funds
      };
      
      const res = await request(app)
        .post(`/api/contracts/${fundedContractId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(execution);
      
      expect(res.statusCode).toBe(200);
      
      // Verify balance increased
      const checkExecution = {
        method: 'getBalance',
        args: []
      };
      
      const checkRes = await request(app)
        .post(`/api/contracts/${fundedContractId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkExecution);
      
      const newBalance = parseInt(checkRes.body.result);
      expect(newBalance).toBeGreaterThanOrEqual(15); // Initial 10 + transferred 5
    });
    
    it('should withdraw funds from contract', async () => {
      const withdrawAmount = 3;
      const withdrawExecution = {
        method: 'withdraw',
        args: [withdrawAmount]
      };
      
      const res = await request(app)
        .post(`/api/contracts/${fundedContractId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(withdrawExecution);
      
      expect(res.statusCode).toBe(200);
      
      // Verify balance decreased
      const checkExecution = {
        method: 'getBalance',
        args: []
      };
      
      const checkRes = await request(app)
        .post(`/api/contracts/${fundedContractId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkExecution);
      
      const newBalance = parseInt(checkRes.body.result);
      expect(newBalance).toBeLessThan(15); // Should be reduced by withdraw amount
    });
    
    it('should transfer funds from contract to address', async () => {
      const recipientAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const transferAmount = 2;
      
      const res = await request(app)
        .post(`/api/contracts/${fundedContractId}/transfer`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientAddress,
          amount: transferAmount
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('txHash');
      expect(res.body).toHaveProperty('newBalance');
      
      // New balance should be reduced
      const originalBalance = 15 - 3; // From previous tests
      expect(res.body.newBalance).toBe(originalBalance - transferAmount);
    });
  });
});
