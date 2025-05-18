import api from './apiConfig';

// Authentication and User APIs
export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get('/users/profile');
  return response.data;
};

export const updateProfile = async (userData) => {
  const response = await api.put('/users/profile', userData);
  return response.data;
};

export const updatePassword = async (currentPassword, newPassword) => {
  const response = await api.put('/users/password', { currentPassword, newPassword });
  return response.data;
};

export const fetchSecuritySettings = async () => {
  const response = await api.get('/users/security');
  return response.data;
};

export const enable2FA = async () => {
  const response = await api.post('/users/security/2fa/enable');
  return response.data;
};

export const disable2FA = async () => {
  const response = await api.post('/users/security/2fa/disable');
  return response.data;
};

export const verifyTwoFactor = async (secret, code) => {
  const response = await api.post('/users/security/2fa/verify', { secret, code });
  return response.data;
};

// Dashboard APIs
export const fetchDashboardData = async () => {
  const response = await api.get('/dashboard');
  return response.data;
};

// Blockchain APIs
export const fetchBlockchainData = async () => {
  const response = await api.get('/blockchain');
  return response.data;
};

export const fetchBlock = async (hashOrHeight) => {
  const response = await api.get(`/blockchain/blocks/${hashOrHeight}`);
  return response.data;
};

export const fetchTransaction = async (id) => {
  const response = await api.get(`/blockchain/transactions/${id}`);
  return response.data;
};

// Wallet APIs
export const fetchWalletData = async () => {
  const response = await api.get('/wallets');
  return response.data;
};

export const generateNewAddress = async () => {
  const response = await api.post('/wallets/address');
  return response.data;
};

export const backupWallet = async (format, password) => {
  const response = await api.post('/wallets/backup', { format, password });
  return response.data;
};

export const importWallet = async (importType, importData, password) => {
  const formData = new FormData();
  formData.append('type', importType);
  formData.append('password', password);
  
  if (importType === 'file') {
    formData.append('file', importData);
  } else {
    formData.append('key', importData);
  }
  
  const response = await api.post('/wallets/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

// Transaction APIs
export const fetchTransactions = async (filter = 'all', sortBy = 'timestamp', sortOrder = 'desc') => {
  const response = await api.get('/transactions', {
    params: { filter, sortBy, sortOrder }
  });
  return response.data;
};

export const createTransaction = async (transactionData) => {
  const response = await api.post('/transactions', transactionData);
  return response.data;
};

export const getTransactionFee = async (amount, customFee) => {
  const response = await api.get('/transactions/fee', {
    params: { amount, customFee }
  });
  return response.data;
};

// Smart Contract APIs
export const fetchContracts = async (filter = 'own') => {
  const response = await api.get('/contracts', {
    params: { filter }
  });
  return response.data;
};

export const createContract = async (contractData) => {
  const response = await api.post('/contracts', contractData);
  return response.data;
};

export const executeContract = async (contractId, params) => {
  const response = await api.post(`/contracts/${contractId}/execute`, params);
  return response.data;
};

export const getContractTemplate = async (templateId) => {
  const response = await api.get(`/contracts/templates/${templateId}`);
  return response.data;
};

// Admin APIs
export const fetchAdminStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const fetchUserList = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const updateUserRole = async (userId, role) => {
  const response = await api.put(`/admin/users/${userId}/role`, { role });
  return response.data;
};

export const fetchNetworkNodes = async () => {
  const response = await api.get('/admin/network/nodes');
  return response.data;
};

export const updateBlockchainConfig = async (config) => {
  const response = await api.put('/admin/blockchain/config', config);
  return response.data;
};
