import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, InputGroup, Alert, Badge, Modal, Row, Col, Tabs, Tab } from 'react-bootstrap';
import { fetchTransactions, createTransaction, getTransactionFee } from '../../utils/api';
import Spinner from '../../components/Spinner/Spinner';
import './TransactionManagement.css';

const TransactionManagement = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('0.001');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [transactionData, setTransactionData] = useState(null);
  const [addressBook, setAddressBook] = useState([]);

  useEffect(() => {
    loadTransactions();
    
    // Simulate loading address book from API
    setAddressBook([
      { label: 'Mining Pool', address: '1A2B3C4D5E6F7G8H9I0J' },
      { label: 'Exchange Account', address: 'K1L2M3N4O5P6Q7R8S9T0' },
      { label: 'Hardware Wallet', address: 'U1V2W3X4Y5Z6A7B8C9D0' }
    ]);
  }, [filter, sortBy, sortOrder]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await fetchTransactions(filter, sortBy, sortOrder);
      setTransactions(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError('Failed to load transactions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = () => {
    // Validate form
    if (!recipientAddress.trim()) {
      setError('Please enter a recipient address');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Create transaction object
    const transaction = {
      recipientAddress,
      amount: amountValue,
      fee: parseFloat(fee),
      memo: memo.trim()
    };
    
    setTransactionData(transaction);
    setShowCreateModal(false);
    setShowConfirmModal(true);
  };

  const handleConfirmTransaction = async () => {
    try {
      setLoading(true);
      await createTransaction(transactionData);
      
      setShowConfirmModal(false);
      resetForm();
      setSuccess('Transaction created successfully');
      
      // Reload transactions
      loadTransactions();
    } catch (err) {
      console.error('Transaction failed:', err);
      setError('Failed to create transaction. Please try again.');
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFeeChange = async (e) => {
    const value = e.target.value;
    setFee(value);

    if (!isNaN(parseFloat(value)) && !isNaN(parseFloat(amount))) {
      try {
        const feeEstimate = await getTransactionFee(parseFloat(amount), parseFloat(value));
        setFee(feeEstimate.fee.toString());
      } catch (err) {
        console.error('Failed to estimate fee:', err);
      }
    }
  };

  const resetForm = () => {
    setRecipientAddress('');
    setAmount('');
    setFee('0.001');
    setMemo('');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
    setTimeout(() => setSuccess(null), 3000);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'confirmed':
        return <Badge bg="success">Confirmed</Badge>;
      case 'pending':
        return <Badge bg="warning">Pending</Badge>;
      case 'failed':
        return <Badge bg="danger">Failed</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'sent':
        return <i className="fas fa-arrow-up text-danger"></i>;
      case 'received':
        return <i className="fas fa-arrow-down text-success"></i>;
      case 'contract':
        return <i className="fas fa-file-contract text-primary"></i>;
      case 'mining':
        return <i className="fas fa-hammer text-warning"></i>;
      default:
        return <i className="fas fa-exchange-alt"></i>;
    }
  };

  const filterTransactions = () => {
    switch(filter) {
      case 'sent':
        return transactions.filter(tx => tx.type === 'sent');
      case 'received':
        return transactions.filter(tx => tx.type === 'received');
      case 'pending':
        return transactions.filter(tx => tx.status === 'pending');
      case 'mining':
        return transactions.filter(tx => tx.type === 'mining');
      case 'contract':
        return transactions.filter(tx => tx.type === 'contract');
      default:
        return transactions;
    }
  };

  const filteredTransactions = filterTransactions();

  return (
    <div className="transaction-management-container">
      <h1 className="transaction-title">Transaction Management</h1>
      
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}
      
      <Card className="transaction-controls">
        <Card.Body>
          <div className="control-row">
            <div className="filter-group">
              <Form.Select 
                className="filter-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Transactions</option>
                <option value="sent">Sent</option>
                <option value="received">Received</option>
                <option value="pending">Pending</option>
                <option value="mining">Mining Rewards</option>
                <option value="contract">Smart Contracts</option>
              </Form.Select>
              
              <Form.Select
                className="sort-select"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-');
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
              >
                <option value="timestamp-desc">Newest First</option>
                <option value="timestamp-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </Form.Select>
            </div>
            
            <Button 
              variant="primary" 
              onClick={() => setShowCreateModal(true)}
            >
              <i className="fas fa-paper-plane"></i> New Transaction
            </Button>
          </div>
        </Card.Body>
      </Card>
      
      {loading ? (
        <Spinner />
      ) : (
        <>
          {filteredTransactions.length > 0 ? (
            <div className="table-responsive">
              <Table hover className="transaction-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Address</th>
                    <th>Amount</th>
                    <th>Fee</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(tx => (
                    <tr key={tx.id} className={`transaction-row ${tx.type}`}>
                      <td className="type-cell">
                        <div className="type-icon">{getTypeIcon(tx.type)}</div>
                        <span className="type-text">{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</span>
                      </td>
                      <td>{new Date(tx.timestamp).toLocaleString()}</td>
                      <td className="address-cell">
                        <div className="address-value" title={tx.address}>{tx.address}</div>
                      </td>
                      <td className={`amount-cell ${tx.type === 'sent' ? 'text-danger' : 'text-success'}`}>
                        {tx.type === 'sent' ? '-' : '+'}{tx.amount} BCC
                      </td>
                      <td>{tx.fee} BCC</td>
                      <td>{getStatusBadge(tx.status)}</td>
                      <td>
                        <Button 
                          variant="light" 
                          size="sm" 
                          className="action-btn"
                          onClick={() => copyToClipboard(tx.id)}
                          title="Copy Transaction ID"
                        >
                          <i className="fas fa-copy"></i>
                        </Button>
                        <Button 
                          variant="light" 
                          size="sm" 
                          className="action-btn"
                          onClick={() => window.location.href = `/blockchain/transactions/${tx.id}`}
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
            <div className="no-data-message">No transactions found</div>
          )}
        </>
      )}
      
      {/* Create Transaction Modal */}
      <Modal 
        show={showCreateModal} 
        onHide={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Create New Transaction</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Recipient Address</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Enter recipient's wallet address"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  required
                />
                <Button 
                  variant="outline-secondary"
                  onClick={() => {
                    // Show address book selection
                    const address = prompt('Select from address book:', addressBook.map(a => `${a.label}: ${a.address}`).join('\n'));
                    if (address) {
                      setRecipientAddress(address.split(': ')[1]);
                    }
                  }}
                >
                  <i className="fas fa-address-book"></i>
                </Button>
              </InputGroup>
            </Form.Group>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Amount (BCC)</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="0.00"
                    min="0.001"
                    step="0.001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Transaction Fee (BCC)</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      placeholder="0.001"
                      min="0.001"
                      step="0.001"
                      value={fee}
                      onChange={handleFeeChange}
                      required
                    />
                    <Button 
                      variant="outline-secondary"
                      onClick={async () => {
                        try {
                          if (!isNaN(parseFloat(amount))) {
                            const feeEstimate = await getTransactionFee(parseFloat(amount));
                            setFee(feeEstimate.fee.toString());
                          }
                        } catch (err) {
                          console.error('Failed to estimate fee:', err);
                        }
                      }}
                    >
                      Auto
                    </Button>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Higher fees may result in faster processing
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Memo (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Add a note to this transaction"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
              <Form.Text className="text-muted">
                This memo will be stored on the blockchain and will be visible to everyone
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowCreateModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateTransaction}
          >
            Continue
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Confirm Transaction Modal */}
      <Modal 
        show={showConfirmModal} 
        onHide={() => setShowConfirmModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Transaction</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {transactionData && (
            <div className="transaction-confirmation">
              <div className="confirmation-item">
                <span className="label">Recipient:</span>
                <span className="value address-value">{transactionData.recipientAddress}</span>
              </div>
              <div className="confirmation-item">
                <span className="label">Amount:</span>
                <span className="value">{transactionData.amount} BCC</span>
              </div>
              <div className="confirmation-item">
                <span className="label">Fee:</span>
                <span className="value">{transactionData.fee} BCC</span>
              </div>
              <div className="confirmation-item">
                <span className="label">Total:</span>
                <span className="value total">{(transactionData.amount + transactionData.fee).toFixed(6)} BCC</span>
              </div>
              {transactionData.memo && (
                <div className="confirmation-item">
                  <span className="label">Memo:</span>
                  <span className="value memo">{transactionData.memo}</span>
                </div>
              )}
              
              <Alert variant="warning" className="mt-3">
                <i className="fas fa-exclamation-triangle"></i> Transactions are irreversible once confirmed on the blockchain
              </Alert>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowConfirmModal(false);
              setShowCreateModal(true);
            }}
          >
            Back
          </Button>
          <Button 
            variant="success" 
            onClick={handleConfirmTransaction}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm & Send'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TransactionManagement;
