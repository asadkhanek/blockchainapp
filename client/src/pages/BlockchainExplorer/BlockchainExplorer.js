import React, { useEffect, useState } from 'react';
import { Card, Table, Form, Button, InputGroup, Alert, Badge, Tab, Tabs } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { fetchBlockchainData, fetchBlock, fetchTransaction } from '../../utils/api';
import Spinner from '../../components/Spinner/Spinner';
import './BlockchainExplorer.css';

const BlockchainExplorer = () => {
  const [loading, setLoading] = useState(true);
  const [blockchainData, setBlockchainData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchType, setSearchType] = useState('block'); // 'block' or 'transaction'
  const [searchError, setSearchError] = useState(null);
  const [activeTab, setActiveTab] = useState('blocks');
  const navigate = useNavigate();

  useEffect(() => {
    const loadBlockchainData = async () => {
      try {
        setLoading(true);
        const data = await fetchBlockchainData();
        setBlockchainData(data);
      } catch (err) {
        console.error('Failed to fetch blockchain data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBlockchainData();
    
    // Refresh data every 30 seconds
    const intervalId = setInterval(loadBlockchainData, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setSearchError('Please enter a valid search query');
      return;
    }

    try {
      setSearchError(null);
      setLoading(true);
      
      if (searchType === 'block') {
        const blockData = await fetchBlock(searchQuery);
        setSearchResults({ type: 'block', data: blockData });
      } else {
        const transactionData = await fetchTransaction(searchQuery);
        setSearchResults({ type: 'transaction', data: transactionData });
      }
    } catch (err) {
      console.error('Search failed:', err);
      setSearchError(`Failed to find ${searchType}. Please check your input and try again.`);
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchError(null);
  };

  const renderBlockDetails = (block) => {
    return (
      <Card className="block-details">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Block Details</h5>
          <Button variant="outline-secondary" size="sm" onClick={resetSearch}>
            Back to Explorer
          </Button>
        </Card.Header>
        <Card.Body>
          <Table responsive>
            <tbody>
              <tr>
                <td>Hash</td>
                <td className="hash-value">{block.hash}</td>
              </tr>
              <tr>
                <td>Previous Hash</td>
                <td className="hash-value">{block.previousHash}</td>
              </tr>
              <tr>
                <td>Height</td>
                <td>{block.height}</td>
              </tr>
              <tr>
                <td>Timestamp</td>
                <td>{new Date(block.timestamp).toLocaleString()}</td>
              </tr>
              <tr>
                <td>Nonce</td>
                <td>{block.nonce}</td>
              </tr>
              <tr>
                <td>Difficulty</td>
                <td>{block.difficulty}</td>
              </tr>
              <tr>
                <td>Miner</td>
                <td className="hash-value">{block.miner}</td>
              </tr>
            </tbody>
          </Table>
          
          <h5 className="mt-4">Transactions ({block.transactions.length})</h5>
          {block.transactions.length > 0 ? (
            <div className="transaction-list-container">
              <Table responsive>
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {block.transactions.map(tx => (
                    <tr key={tx.id} onClick={() => {
                      setSearchType('transaction');
                      setSearchQuery(tx.id);
                      handleSearch({ preventDefault: () => {} });
                    }} className="transaction-row">
                      <td className="hash-value">{tx.id}</td>
                      <td className="hash-value">{tx.from}</td>
                      <td className="hash-value">{tx.to}</td>
                      <td>{tx.amount} BCC</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="no-data-message">No transactions in this block</div>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderTransactionDetails = (transaction) => {
    return (
      <Card className="transaction-details">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Transaction Details</h5>
          <Button variant="outline-secondary" size="sm" onClick={resetSearch}>
            Back to Explorer
          </Button>
        </Card.Header>
        <Card.Body>
          <Table responsive>
            <tbody>
              <tr>
                <td>Transaction ID</td>
                <td className="hash-value">{transaction.id}</td>
              </tr>
              <tr>
                <td>Status</td>
                <td>
                  <Badge bg={transaction.confirmed ? "success" : "warning"}>
                    {transaction.confirmed ? "Confirmed" : "Pending"}
                  </Badge>
                </td>
              </tr>
              <tr>
                <td>Block Height</td>
                <td>
                  {transaction.blockHeight ? (
                    <span 
                      className="block-link"
                      onClick={() => {
                        setSearchType('block');
                        setSearchQuery(transaction.blockHeight);
                        handleSearch({ preventDefault: () => {} });
                      }}
                    >
                      {transaction.blockHeight}
                    </span>
                  ) : (
                    "Pending"
                  )}
                </td>
              </tr>
              <tr>
                <td>Timestamp</td>
                <td>{new Date(transaction.timestamp).toLocaleString()}</td>
              </tr>
              <tr>
                <td>From</td>
                <td className="hash-value">{transaction.from}</td>
              </tr>
              <tr>
                <td>To</td>
                <td className="hash-value">{transaction.to}</td>
              </tr>
              <tr>
                <td>Amount</td>
                <td>{transaction.amount} BCC</td>
              </tr>
              <tr>
                <td>Fee</td>
                <td>{transaction.fee} BCC</td>
              </tr>
              {transaction.data && (
                <tr>
                  <td>Data</td>
                  <td>
                    <div className="transaction-data">
                      {transaction.data}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          
          {transaction.contract && (
            <div className="contract-section mt-4">
              <h5>Smart Contract</h5>
              <Badge bg="info" className="mb-2">Contract Execution</Badge>
              <div className="contract-code">
                <pre>{transaction.contract.code}</pre>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderBlockchainExplorer = () => {
    return (
      <div className="blockchain-explorer-content">
        <Card className="search-card">
          <Card.Body>
            <Form onSubmit={handleSearch}>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder={searchType === 'block' 
                    ? "Search by block hash or height..." 
                    : "Search by transaction ID..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button variant="primary" type="submit">
                  Search
                </Button>
              </InputGroup>
              
              <div className="search-options mt-2">
                <Form.Check
                  inline
                  type="radio"
                  label="Block"
                  name="searchType"
                  id="block-search"
                  checked={searchType === 'block'}
                  onChange={() => setSearchType('block')}
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Transaction"
                  name="searchType"
                  id="transaction-search"
                  checked={searchType === 'transaction'}
                  onChange={() => setSearchType('transaction')}
                />
              </div>
            </Form>
          </Card.Body>
        </Card>
        
        {searchError && <Alert variant="danger" className="mt-3">{searchError}</Alert>}
        
        {!searchResults && (
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mt-4"
          >
            <Tab eventKey="blocks" title="Blocks">
              <Card className="data-card">
                <Card.Body>
                  <h5>Latest Blocks</h5>
                  <div className="table-responsive">
                    <Table hover>
                      <thead>
                        <tr>
                          <th>Height</th>
                          <th>Timestamp</th>
                          <th>Transactions</th>
                          <th>Miner</th>
                          <th>Hash</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blockchainData?.blocks.map(block => (
                          <tr key={block.hash} onClick={() => {
                            setSearchType('block');
                            setSearchQuery(block.hash);
                            handleSearch({ preventDefault: () => {} });
                          }} className="block-row">
                            <td>{block.height}</td>
                            <td>{new Date(block.timestamp).toLocaleString()}</td>
                            <td>{block.transactionCount}</td>
                            <td className="hash-value">{block.miner}</td>
                            <td className="hash-value">{block.hash}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Tab>
            <Tab eventKey="transactions" title="Transactions">
              <Card className="data-card">
                <Card.Body>
                  <h5>Latest Transactions</h5>
                  <div className="table-responsive">
                    <Table hover>
                      <thead>
                        <tr>
                          <th>Transaction ID</th>
                          <th>Block</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Amount</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blockchainData?.transactions.map(tx => (
                          <tr key={tx.id} onClick={() => {
                            setSearchType('transaction');
                            setSearchQuery(tx.id);
                            handleSearch({ preventDefault: () => {} });
                          }} className="transaction-row">
                            <td className="hash-value">{tx.id}</td>
                            <td>{tx.blockHeight}</td>
                            <td className="hash-value">{tx.from}</td>
                            <td className="hash-value">{tx.to}</td>
                            <td>{tx.amount} BCC</td>
                            <td>{new Date(tx.timestamp).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        )}
      </div>
    );
  };

  if (loading && !blockchainData && !searchResults) return <Spinner />;

  return (
    <div className="blockchain-explorer-container">
      <h1 className="explorer-title">Blockchain Explorer</h1>
      
      {searchResults ? (
        searchResults.type === 'block' ? 
          renderBlockDetails(searchResults.data) :
          renderTransactionDetails(searchResults.data)
      ) : (
        renderBlockchainExplorer()
      )}
      
      {blockchainData && (
        <div className="blockchain-stats">
          <div className="stat-item">
            <span>Blocks:</span>
            <span>{blockchainData.stats.totalBlocks}</span>
          </div>
          <div className="stat-item">
            <span>Transactions:</span>
            <span>{blockchainData.stats.totalTransactions}</span>
          </div>
          <div className="stat-item">
            <span>Difficulty:</span>
            <span>{blockchainData.stats.currentDifficulty}</span>
          </div>
          <div className="stat-item">
            <span>Hash Rate:</span>
            <span>{blockchainData.stats.networkHashRate} H/s</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockchainExplorer;
