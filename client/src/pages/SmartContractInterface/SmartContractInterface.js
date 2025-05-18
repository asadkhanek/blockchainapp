import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, Table, Modal, Tab, Tabs, Badge } from 'react-bootstrap';
import { fetchContracts, createContract, executeContract, getContractTemplate } from '../../utils/api';
import CodeEditor from '../../components/CodeEditor/CodeEditor';
import Spinner from '../../components/Spinner/Spinner';
import './SmartContractInterface.css';

const SmartContractInterface = () => {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [contractName, setContractName] = useState('');
  const [contractCode, setContractCode] = useState('');
  const [contractDescription, setContractDescription] = useState('');
  const [contractFee, setContractFee] = useState('0.01');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templatesList, setTemplatesList] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [executeParams, setExecuteParams] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('myContracts');

  useEffect(() => {
    loadContracts();
    loadTemplates();
  }, [activeTab]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await fetchContracts(activeTab === 'myContracts' ? 'own' : 'all');
      setContracts(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
      setError('Failed to load contracts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const templates = [
        { id: 'simpleTransfer', name: 'Simple Transfer', description: 'Transfer tokens based on conditions' },
        { id: 'crowdfunding', name: 'Crowdfunding', description: 'Collect funds for a goal with deadline' },
        { id: 'timelock', name: 'Time Lock', description: 'Lock tokens until specified time' },
        { id: 'votingSystem', name: 'Voting System', description: 'Simple on-chain voting mechanism' },
        { id: 'multiSignature', name: 'Multi-signature Wallet', description: 'Require multiple parties to authorize transactions' }
      ];
      setTemplatesList(templates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleTemplateSelect = async (templateId) => {
    try {
      setLoading(true);
      const template = await getContractTemplate(templateId);
      setContractName(template.name);
      setContractCode(template.code);
      setContractDescription(template.description);
      setSelectedTemplate(templateId);
    } catch (err) {
      console.error('Failed to load template:', err);
      setError('Failed to load template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = async (e) => {
    e.preventDefault();
    
    if (!contractName.trim()) {
      setError('Please enter a contract name');
      return;
    }

    if (!contractCode.trim()) {
      setError('Please enter contract code');
      return;
    }

    try {
      setLoading(true);
      await createContract({
        name: contractName,
        code: contractCode,
        description: contractDescription,
        fee: parseFloat(contractFee)
      });
      
      setShowCreateModal(false);
      resetContractForm();
      setSuccess('Contract created successfully');
      
      // Reload contracts
      loadContracts();
    } catch (err) {
      console.error('Contract creation failed:', err);
      setError('Failed to create contract. Please check your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteContract = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await executeContract(selectedContract.id, executeParams);
      
      setShowExecuteModal(false);
      setExecuteParams({});
      setSuccess('Contract executed successfully');
      
      // Reload contracts
      loadContracts();
    } catch (err) {
      console.error('Contract execution failed:', err);
      setError('Failed to execute contract. Please check parameters and try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetContractForm = () => {
    setContractName('');
    setContractCode('');
    setContractDescription('');
    setContractFee('0.01');
    setSelectedTemplate('');
  };

  const openExecuteModal = (contract) => {
    setSelectedContract(contract);
    
    // Initialize params based on contract parameters
    const initialParams = {};
    if (contract.parameters) {
      contract.parameters.forEach(param => {
        initialParams[param.name] = '';
      });
    }
    setExecuteParams(initialParams);
    
    setShowExecuteModal(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
    setTimeout(() => setSuccess(null), 3000);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'deployed':
        return <Badge bg="success">Deployed</Badge>;
      case 'pending':
        return <Badge bg="warning">Pending</Badge>;
      case 'failed':
        return <Badge bg="danger">Failed</Badge>;
      case 'completed':
        return <Badge bg="info">Completed</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="smart-contract-container">
      <h1 className="contract-title">Smart Contract Management</h1>
      
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}
      
      <Card className="contract-controls">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Smart Contracts</h5>
            <Button 
              variant="primary" 
              onClick={() => setShowCreateModal(true)}
            >
              <i className="fas fa-plus"></i> Create Contract
            </Button>
          </div>
        </Card.Body>
      </Card>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mt-4"
      >
        <Tab eventKey="myContracts" title="My Contracts">
          {loading && !contracts.length ? (
            <Spinner />
          ) : (
            <>
              {contracts.length > 0 ? (
                <div className="table-responsive">
                  <Table hover className="contract-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Created</th>
                        <th>Status</th>
                        <th>Fee</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map(contract => (
                        <tr key={contract.id} className="contract-row">
                          <td>{contract.name}</td>
                          <td className="description-cell">
                            <div className="description-text">{contract.description}</div>
                          </td>
                          <td>{new Date(contract.createdAt).toLocaleString()}</td>
                          <td>{getStatusBadge(contract.status)}</td>
                          <td>{contract.fee} BCC</td>
                          <td>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="action-btn"
                              onClick={() => openExecuteModal(contract)}
                              disabled={contract.status !== 'deployed'}
                            >
                              <i className="fas fa-play"></i>
                            </Button>
                            <Button 
                              variant="light" 
                              size="sm" 
                              className="action-btn"
                              onClick={() => copyToClipboard(contract.id)}
                              title="Copy Contract ID"
                            >
                              <i className="fas fa-copy"></i>
                            </Button>
                            <Button 
                              variant="light" 
                              size="sm" 
                              className="action-btn"
                              onClick={() => window.location.href = `/contracts/${contract.id}`}
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="no-data-message">No contracts found</div>
              )}
            </>
          )}
        </Tab>
        <Tab eventKey="deployedContracts" title="Deployed Contracts">
          {loading ? (
            <Spinner />
          ) : (
            <>
              {contracts.length > 0 ? (
                <div className="table-responsive">
                  <Table hover className="contract-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Owner</th>
                        <th>Description</th>
                        <th>Created</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map(contract => (
                        <tr key={contract.id} className="contract-row">
                          <td>{contract.name}</td>
                          <td className="owner-cell">
                            <div className="address-text">{contract.owner}</div>
                          </td>
                          <td className="description-cell">
                            <div className="description-text">{contract.description}</div>
                          </td>
                          <td>{new Date(contract.createdAt).toLocaleString()}</td>
                          <td>{getStatusBadge(contract.status)}</td>
                          <td>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="action-btn"
                              onClick={() => openExecuteModal(contract)}
                              disabled={contract.status !== 'deployed'}
                            >
                              <i className="fas fa-play"></i>
                            </Button>
                            <Button 
                              variant="light" 
                              size="sm" 
                              className="action-btn"
                              onClick={() => window.location.href = `/contracts/${contract.id}`}
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="no-data-message">No deployed contracts found</div>
              )}
            </>
          )}
        </Tab>
      </Tabs>
      
      {/* Create Contract Modal */}
      <Modal 
        show={showCreateModal} 
        onHide={() => {
          setShowCreateModal(false);
          resetContractForm();
        }}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Smart Contract</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateContract}>
            <Form.Group className="mb-3">
              <Form.Label>Contract Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter contract name"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Brief description of the contract's purpose"
                value={contractDescription}
                onChange={(e) => setContractDescription(e.target.value)}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Contract Fee (BCC)</Form.Label>
              <Form.Control
                type="number"
                placeholder="0.01"
                min="0.001"
                step="0.001"
                value={contractFee}
                onChange={(e) => setContractFee(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                This fee will be charged for each execution of the contract
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Template (Optional)</Form.Label>
              <Form.Select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
              >
                <option value="">Select a template...</option>
                {templatesList.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Contract Code</Form.Label>
              <CodeEditor 
                language="javascript"
                value={contractCode}
                onChange={(code) => setContractCode(code)}
                height="300px"
              />
              <Form.Text className="text-muted">
                Write your contract code using the supported BCC contract language
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowCreateModal(false);
              resetContractForm();
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateContract}
          >
            Create Contract
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Execute Contract Modal */}
      <Modal 
        show={showExecuteModal} 
        onHide={() => setShowExecuteModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Execute Contract: {selectedContract?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedContract && (
            <Form onSubmit={handleExecuteContract}>
              <div className="contract-info-section">
                <div className="info-item">
                  <span className="label">Contract ID:</span>
                  <span className="value">{selectedContract.id}</span>
                </div>
                <div className="info-item">
                  <span className="label">Owner:</span>
                  <span className="value address-text">{selectedContract.owner}</span>
                </div>
                <div className="info-item">
                  <span className="label">Fee:</span>
                  <span className="value">{selectedContract.fee} BCC</span>
                </div>
              </div>
              
              <hr />
              
              <h6>Contract Parameters</h6>
              {selectedContract.parameters && selectedContract.parameters.length > 0 ? (
                selectedContract.parameters.map(param => (
                  <Form.Group key={param.name} className="mb-3">
                    <Form.Label>{param.name} ({param.type})</Form.Label>
                    <Form.Control
                      type={param.type === 'number' ? 'number' : 'text'}
                      placeholder={`Enter ${param.name}`}
                      value={executeParams[param.name] || ''}
                      onChange={(e) => setExecuteParams({
                        ...executeParams,
                        [param.name]: e.target.value
                      })}
                      required={param.required}
                    />
                    {param.description && (
                      <Form.Text className="text-muted">
                        {param.description}
                      </Form.Text>
                    )}
                  </Form.Group>
                ))
              ) : (
                <div className="no-params-message">This contract does not require any parameters</div>
              )}
              
              <Alert variant="info" className="mt-3">
                <i className="fas fa-info-circle"></i> Executing this contract will charge {selectedContract.fee} BCC to your wallet
              </Alert>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowExecuteModal(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleExecuteContract}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Execute Contract'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SmartContractInterface;
