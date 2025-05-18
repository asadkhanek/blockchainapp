import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, Row, Col, Table, Modal, Tab, Tabs } from 'react-bootstrap';
import { fetchWalletData, backupWallet, importWallet, generateNewAddress } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/Spinner/Spinner';
import QRCode from 'qrcode.react';
import './WalletManagement.css';

const WalletManagement = () => {
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [importType, setImportType] = useState('key');
  const [importFile, setImportFile] = useState(null);
  const [importKey, setImportKey] = useState('');
  const [backupPassword, setBackupPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('wallet');
  const [exportFormat, setExportFormat] = useState('json');
  const [selectedAddress, setSelectedAddress] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    loadWalletData();
    
    // Refresh wallet data every 30 seconds
    const intervalId = setInterval(loadWalletData, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const data = await fetchWalletData();
      setWalletData(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch wallet data:', err);
      setError('Failed to load wallet data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupWallet = async (e) => {
    e.preventDefault();
    
    if (!backupPassword) {
      setError('Please enter a password to secure your backup');
      return;
    }

    try {
      setLoading(true);
      const result = await backupWallet(exportFormat, backupPassword);
      
      // For file download
      const element = document.createElement('a');
      const file = new Blob([result.data], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `blockchain-wallet-backup.${exportFormat}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      setShowBackupModal(false);
      setBackupPassword('');
      setSuccess('Wallet backup completed successfully');
    } catch (err) {
      console.error('Wallet backup failed:', err);
      setError('Failed to backup wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportWallet = async (e) => {
    e.preventDefault();
    
    if (importType === 'key' && !importKey) {
      setError('Please enter your private key');
      return;
    }
    
    if (importType === 'file' && !importFile) {
      setError('Please select a backup file');
      return;
    }
    
    if (!importPassword) {
      setError('Please enter your backup password');
      return;
    }

    try {
      setLoading(true);
      await importWallet(importType, importType === 'file' ? importFile : importKey, importPassword);
      
      setShowImportModal(false);
      setImportKey('');
      setImportFile(null);
      setImportPassword('');
      setSuccess('Wallet imported successfully');
      
      // Reload wallet data
      loadWalletData();
    } catch (err) {
      console.error('Wallet import failed:', err);
      setError('Failed to import wallet. Please check your backup and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setImportFile(e.target.files[0]);
  };

  const handleGenerateNewAddress = async () => {
    try {
      setLoading(true);
      const newAddress = await generateNewAddress();
      setSelectedAddress(newAddress);
      setShowAddressModal(true);
      
      // Reload wallet data
      loadWalletData();
    } catch (err) {
      console.error('Failed to generate address:', err);
      setError('Failed to generate new address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
    setTimeout(() => setSuccess(null), 3000);
  };

  if (loading && !walletData) return <Spinner />;

  return (
    <div className="wallet-management-container">
      <h1 className="wallet-title">Wallet Management</h1>
      
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="wallet" title="Wallet Overview">
          <Row>
            <Col md={8}>
              <Card className="wallet-card">
                <Card.Body>
                  <div className="wallet-header">
                    <div>
                      <h2 className="balance-title">Balance</h2>
                      <h3 className="balance-amount">{walletData?.balance} BCC</h3>
                      <p className="balance-usd">${walletData?.balanceUSD} USD</p>
                    </div>
                    {selectedAddress && (
                      <div className="qr-container">
                        <QRCode value={selectedAddress.address} size={120} />
                      </div>
                    )}
                  </div>
                  
                  <div className="button-group">
                    <Button variant="primary" onClick={() => setShowAddressModal(true)}>
                      <i className="fas fa-qrcode"></i> Show QR Code
                    </Button>
                    <Button variant="success" onClick={handleGenerateNewAddress}>
                      <i className="fas fa-plus-circle"></i> Generate New Address
                    </Button>
                    <Button variant="info" onClick={() => setShowBackupModal(true)}>
                      <i className="fas fa-download"></i> Backup Wallet
                    </Button>
                    <Button variant="warning" onClick={() => setShowImportModal(true)}>
                      <i className="fas fa-upload"></i> Import Wallet
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4}>
              <Card className="address-card">
                <Card.Header>Default Address</Card.Header>
                <Card.Body>
                  <div className="address-item">
                    <div className="address-details">
                      <div className="address-value">{walletData?.primaryAddress}</div>
                      <div className="address-balance">{walletData?.balance} BCC</div>
                    </div>
                    <Button 
                      variant="light" 
                      className="copy-button"
                      onClick={() => copyToClipboard(walletData?.primaryAddress)}
                    >
                      <i className="fas fa-copy"></i>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Card className="address-list-card mt-4">
            <Card.Header>Your Addresses</Card.Header>
            <Card.Body>
              {walletData?.addresses.length > 0 ? (
                <Table hover responsive className="address-table">
                  <thead>
                    <tr>
                      <th>Address</th>
                      <th>Label</th>
                      <th>Balance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletData.addresses.map(address => (
                      <tr key={address.address}>
                        <td className="address-cell">
                          <div className="address-value">{address.address}</div>
                        </td>
                        <td>{address.label || 'Address ' + (walletData.addresses.indexOf(address) + 1)}</td>
                        <td>{address.balance} BCC</td>
                        <td>
                          <Button 
                            variant="light" 
                            size="sm" 
                            className="action-btn"
                            onClick={() => copyToClipboard(address.address)}
                          >
                            <i className="fas fa-copy"></i>
                          </Button>
                          <Button 
                            variant="light" 
                            size="sm" 
                            className="action-btn"
                            onClick={() => {
                              setSelectedAddress(address);
                              setShowAddressModal(true);
                            }}
                          >
                            <i className="fas fa-qrcode"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="no-data-message">No additional addresses found</div>
              )}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="security" title="Security & Keys">
          <Card className="security-card">
            <Card.Header>Security Settings</Card.Header>
            <Card.Body>
              <div className="security-section">
                <h5>Private Key</h5>
                <p className="warning-text">
                  <i className="fas fa-exclamation-triangle"></i>
                  Never share your private key with anyone. Anyone with your private key has full access to your funds.
                </p>
                
                <div className="key-container">
                  <div className="key-value">
                    ••••••••••••••••••••••••••••••••••••••••••••••••••
                  </div>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => alert('For security reasons, this functionality is disabled in this demo.')}
                  >
                    <i className="fas fa-eye"></i> Show
                  </Button>
                </div>
              </div>
              
              <hr />
              
              <div className="security-section">
                <h5>Two-Factor Authentication</h5>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="mb-1">{user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
                    <p className="text-muted security-description">
                      Adds an extra layer of security to your account by requiring a verification code.
                    </p>
                  </div>
                  <Button 
                    variant={user?.twoFactorEnabled ? "danger" : "success"}
                    onClick={() => alert('This functionality would navigate to the 2FA setup page.')}
                  >
                    {user?.twoFactorEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
              
              <hr />
              
              <div className="security-section">
                <h5>Recovery Phrases</h5>
                <p className="security-description">
                  A recovery phrase gives you a way to restore your wallet if you lose access to your account or forget your password.
                </p>
                <Button 
                  variant="primary"
                  onClick={() => alert('This functionality would show or generate a recovery phrase.')}
                >
                  <i className="fas fa-key"></i> View Recovery Phrase
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
      
      {/* Backup Wallet Modal */}
      <Modal show={showBackupModal} onHide={() => setShowBackupModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Backup Wallet</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleBackupWallet}>
            <Form.Group className="mb-3">
              <Form.Label>Backup Format</Form.Label>
              <div>
                <Form.Check
                  inline
                  type="radio"
                  label="JSON"
                  name="exportFormat"
                  id="export-json"
                  checked={exportFormat === 'json'}
                  onChange={() => setExportFormat('json')}
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Text"
                  name="exportFormat"
                  id="export-text"
                  checked={exportFormat === 'txt'}
                  onChange={() => setExportFormat('txt')}
                />
              </div>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Encryption Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter a strong password"
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                This password will be used to encrypt your backup. Keep it safe.
              </Form.Text>
            </Form.Group>
            
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Download Backup'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      
      {/* Import Wallet Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Import Wallet</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleImportWallet}>
            <Form.Group className="mb-3">
              <Form.Label>Import Method</Form.Label>
              <div>
                <Form.Check
                  inline
                  type="radio"
                  label="Private Key"
                  name="importType"
                  id="import-key"
                  checked={importType === 'key'}
                  onChange={() => setImportType('key')}
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Backup File"
                  name="importType"
                  id="import-file"
                  checked={importType === 'file'}
                  onChange={() => setImportType('file')}
                />
              </div>
            </Form.Group>
            
            {importType === 'key' ? (
              <Form.Group className="mb-3">
                <Form.Label>Private Key</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter your private key"
                  value={importKey}
                  onChange={(e) => setImportKey(e.target.value)}
                  required
                />
              </Form.Group>
            ) : (
              <Form.Group className="mb-3">
                <Form.Label>Backup File</Form.Label>
                <Form.Control
                  type="file"
                  onChange={handleFileChange}
                  required
                />
              </Form.Group>
            )}
            
            <Form.Group className="mb-3">
              <Form.Label>Backup Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter your backup password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                required
              />
            </Form.Group>
            
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Import Wallet'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      
      {/* Address QR Code Modal */}
      <Modal show={showAddressModal} onHide={() => setShowAddressModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Wallet Address</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <div className="qr-modal-content">
            <QRCode 
              value={selectedAddress?.address || walletData?.primaryAddress} 
              size={200}
              className="qr-code"
            />
            <div className="address-display">
              <p className="address-value">{selectedAddress?.address || walletData?.primaryAddress}</p>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => copyToClipboard(selectedAddress?.address || walletData?.primaryAddress)}
              >
                <i className="fas fa-copy"></i> Copy
              </Button>
            </div>
            <p className="text-muted mt-3">
              Scan this QR code to receive BCC coins to this address
            </p>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default WalletManagement;
