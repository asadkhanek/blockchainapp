import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import ContractList from '../../components/contracts/ContractList';
import ContractDetails from '../../components/contracts/ContractDetails';
import DeployContract from '../../components/contracts/DeployContract';
import ContractInteraction from '../../components/contracts/ContractInteraction';

// Mock the API calls
jest.mock('../../api/contracts', () => ({
  getUserContracts: jest.fn().mockResolvedValue({
    success: true,
    contracts: [
      {
        id: 'contract1',
        name: 'Token Contract',
        address: '0xc0ffee254729296a45a3885639AC7E10F9d54979',
        type: 'ERC20',
        createdAt: '2025-03-10T08:00:00.000Z',
        status: 'deployed'
      },
      {
        id: 'contract2',
        name: 'NFT Collection',
        address: '0xe5c0ee254729296a45a3885639AC7E10F9d5cafe',
        type: 'ERC721',
        createdAt: '2025-04-01T14:30:00.000Z',
        status: 'deployed'
      }
    ]
  }),
  getContractById: jest.fn().mockResolvedValue({
    success: true,
    contract: {
      id: 'contract1',
      name: 'Token Contract',
      address: '0xc0ffee254729296a45a3885639AC7E10F9d54979',
      type: 'ERC20',
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          inputs: [{ name: 'owner', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }]
        },
        {
          name: 'transfer',
          type: 'function',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }
      ],
      bytecode: '0x608060405234801...',
      createdAt: '2025-03-10T08:00:00.000Z',
      deployedAt: '2025-03-10T08:05:23.000Z',
      creator: '0x1234567890abcdef1234567890abcdef12345678',
      status: 'deployed',
      transactions: 42
    }
  }),
  deployContract: jest.fn().mockResolvedValue({
    success: true,
    contract: {
      id: 'contract3',
      name: 'New Contract',
      address: '0xd0d0c0ffee254729296a45a3885639AC7E10F9d5',
      type: 'Custom',
      createdAt: new Date().toISOString(),
      status: 'pending',
      transactionHash: '0xtx123456'
    }
  }),
  callContractMethod: jest.fn().mockImplementation((contractId, method, params) => {
    // Simulate different responses based on method called
    if (method === 'balanceOf') {
      return Promise.resolve({
        success: true,
        result: '1000000000000000000' // 1 token with 18 decimals
      });
    } else if (method === 'transfer') {
      return Promise.resolve({
        success: true,
        transactionHash: '0xtx654321'
      });
    }
    return Promise.resolve({ success: false, error: 'Method not supported in mock' });
  }),
  getContractTemplates: jest.fn().mockResolvedValue({
    success: true,
    templates: [
      { id: 'erc20', name: 'ERC20 Token', type: 'ERC20' },
      { id: 'erc721', name: 'ERC721 NFT', type: 'ERC721' },
      { id: 'erc1155', name: 'ERC1155 Multi-Token', type: 'ERC1155' }
    ]
  })
}));

// Utility function to render components inside required providers
const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Smart Contract Components Tests', () => {
  beforeEach(() => {
    // Clear mocks between tests
    jest.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockReturnValue('fake-token'),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
  });
  
  describe('Contract List Component', () => {
    it('renders list of user contracts', async () => {
      const { getUserContracts } = require('../../api/contracts');
      renderWithProviders(<ContractList />);
      
      // Check loading state
      expect(screen.getByText(/Loading contracts/i)).toBeInTheDocument();
      
      // Check if contracts are displayed after loading
      await waitFor(() => {
        expect(screen.getByText(/Token Contract/i)).toBeInTheDocument();
        expect(screen.getByText(/NFT Collection/i)).toBeInTheDocument();
      });
      
      // Check contract details
      expect(screen.getByText(/0xc0ffee/i)).toBeInTheDocument(); // Shortened address
      expect(screen.getByText(/ERC20/i)).toBeInTheDocument();
      expect(screen.getByText(/ERC721/i)).toBeInTheDocument();
      
      // Verify API call
      expect(getUserContracts).toHaveBeenCalled();
    });
    
    it('displays empty message when no contracts exist', async () => {
      const { getUserContracts } = require('../../api/contracts');
      getUserContracts.mockResolvedValueOnce({
        success: true,
        contracts: []
      });
      
      renderWithProviders(<ContractList />);
      
      await waitFor(() => {
        expect(screen.getByText(/No contracts found/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Contract Details Component', () => {
    it('renders detailed contract information', async () => {
      const { getContractById } = require('../../api/contracts');
      renderWithProviders(<ContractDetails contractId="contract1" />);
      
      // Check loading state
      expect(screen.getByText(/Loading contract details/i)).toBeInTheDocument();
      
      // Check if contract details are displayed after loading
      await waitFor(() => {
        expect(screen.getByText(/Token Contract/i)).toBeInTheDocument();
        expect(screen.getByText(/0xc0ffee254729296a45a3885639AC7E10F9d54979/i)).toBeInTheDocument();
        expect(screen.getByText(/ERC20/i)).toBeInTheDocument();
      });
      
      // Check ABI and methods display
      expect(screen.getByText(/Contract ABI/i)).toBeInTheDocument();
      expect(screen.getByText(/balanceOf/i)).toBeInTheDocument();
      expect(screen.getByText(/transfer/i)).toBeInTheDocument();
      
      // Check deployment info
      expect(screen.getByText(/Deployed At:/i)).toBeInTheDocument();
      expect(screen.getByText(/Mar 10, 2025/i)).toBeInTheDocument();
      
      // Check transactions count
      expect(screen.getByText(/42 transactions/i)).toBeInTheDocument();
      
      // Verify API call
      expect(getContractById).toHaveBeenCalledWith('contract1');
    });
  });
  
  describe('Deploy Contract Component', () => {
    it('renders contract deployment form', async () => {
      const { getContractTemplates } = require('../../api/contracts');
      renderWithProviders(<DeployContract />);
      
      // Check if form elements are displayed
      await waitFor(() => {
        expect(screen.getByText(/Deploy Smart Contract/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Contract Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Contract Type/i)).toBeInTheDocument();
      });
      
      // Check if templates are loaded
      await waitFor(() => {
        expect(screen.getByText(/ERC20 Token/i)).toBeInTheDocument();
        expect(screen.getByText(/ERC721 NFT/i)).toBeInTheDocument();
      });
      
      // Verify API call
      expect(getContractTemplates).toHaveBeenCalled();
    });
    
    it('submits contract deployment', async () => {
      const { deployContract, getContractTemplates } = require('../../api/contracts');
      renderWithProviders(<DeployContract />);
      
      // Wait for templates to load
      await waitFor(() => {
        expect(screen.getByLabelText(/Contract Name/i)).toBeInTheDocument();
      });
      
      // Fill out form
      fireEvent.change(screen.getByLabelText(/Contract Name/i), {
        target: { value: 'New Contract' }
      });
      
      // Select template
      fireEvent.change(screen.getByLabelText(/Contract Type/i), {
        target: { value: 'erc20' }
      });
      
      // Add token details if available
      const initialSupplyInput = screen.queryByLabelText(/Initial Supply/i);
      if (initialSupplyInput) {
        fireEvent.change(initialSupplyInput, {
          target: { value: '1000000' }
        });
      }
      
      const tokenNameInput = screen.queryByLabelText(/Token Name/i);
      if (tokenNameInput) {
        fireEvent.change(tokenNameInput, {
          target: { value: 'New Token' }
        });
      }
      
      const tokenSymbolInput = screen.queryByLabelText(/Token Symbol/i);
      if (tokenSymbolInput) {
        fireEvent.change(tokenSymbolInput, {
          target: { value: 'NTKN' }
        });
      }
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Deploy Contract/i }));
      
      // Check success message
      await waitFor(() => {
        expect(deployContract).toHaveBeenCalled();
        expect(screen.getByText(/Contract deployment initiated/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Contract Interaction Component', () => {
    it('renders contract interaction interface', async () => {
      const { getContractById } = require('../../api/contracts');
      renderWithProviders(<ContractInteraction contractId="contract1" />);
      
      // Check loading state
      expect(screen.getByText(/Loading contract/i)).toBeInTheDocument();
      
      // Check if methods are displayed after loading
      await waitFor(() => {
        expect(screen.getByText(/Contract Methods/i)).toBeInTheDocument();
        expect(screen.getByText(/balanceOf/i)).toBeInTheDocument();
        expect(screen.getByText(/transfer/i)).toBeInTheDocument();
      });
    });
    
    it('calls read method and displays result', async () => {
      const { getContractById, callContractMethod } = require('../../api/contracts');
      renderWithProviders(<ContractInteraction contractId="contract1" />);
      
      // Wait for contract to load
      await waitFor(() => {
        expect(screen.getByText(/balanceOf/i)).toBeInTheDocument();
      });
      
      // Click on the balanceOf method
      fireEvent.click(screen.getByText(/balanceOf/i));
      
      // Fill the address parameter
      await waitFor(() => {
        const addressInput = screen.getByLabelText(/owner/i);
        fireEvent.change(addressInput, {
          target: { value: '0x1234567890abcdef1234567890abcdef12345678' }
        });
      });
      
      // Call the method
      fireEvent.click(screen.getByRole('button', { name: /Call/i }));
      
      // Check if result is displayed
      await waitFor(() => {
        expect(callContractMethod).toHaveBeenCalledWith(
          'contract1', 
          'balanceOf', 
          ['0x1234567890abcdef1234567890abcdef12345678']
        );
        expect(screen.getByText(/1.0/i)).toBeInTheDocument(); // Formatted result
      });
    });
    
    it('calls write method and shows transaction hash', async () => {
      const { getContractById, callContractMethod } = require('../../api/contracts');
      renderWithProviders(<ContractInteraction contractId="contract1" />);
      
      // Wait for contract to load
      await waitFor(() => {
        expect(screen.getByText(/transfer/i)).toBeInTheDocument();
      });
      
      // Click on the transfer method
      fireEvent.click(screen.getByText(/transfer/i));
      
      // Fill the parameters
      await waitFor(() => {
        const addressInput = screen.getByLabelText(/to/i);
        fireEvent.change(addressInput, {
          target: { value: '0xabcdef1234567890abcdef1234567890abcdef12' }
        });
        
        const amountInput = screen.getByLabelText(/amount/i);
        fireEvent.change(amountInput, {
          target: { value: '100' }
        });
      });
      
      // Call the method
      fireEvent.click(screen.getByRole('button', { name: /Execute/i }));
      
      // Check if transaction hash is displayed
      await waitFor(() => {
        expect(callContractMethod).toHaveBeenCalledWith(
          'contract1', 
          'transfer', 
          ['0xabcdef1234567890abcdef1234567890abcdef12', '100']
        );
        expect(screen.getByText(/Transaction sent/i)).toBeInTheDocument();
        expect(screen.getByText(/0xtx654321/i)).toBeInTheDocument();
      });
    });
  });
});
