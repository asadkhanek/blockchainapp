import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchDashboardData } from '../../utils/api';
import Spinner from '../../components/Spinner/Spinner';
import './Dashboard.css';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const data = await fetchDashboardData();
        setDashboardData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    
    // Refresh data every minute
    const intervalId = setInterval(loadDashboardData, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Dashboard</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {dashboardData && (
        <>
          <Row className="overview-section">
            <Col md={4}>
              <Card className="overview-card">
                <Card.Body>
                  <Card.Title>Wallet Balance</Card.Title>
                  <Card.Text className="balance-amount">
                    {dashboardData.walletBalance} BCC
                  </Card.Text>
                  <Button 
                    variant="primary" 
                    onClick={() => navigate('/wallet')}
                  >
                    Manage Wallet
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4}>
              <Card className="overview-card">
                <Card.Body>
                  <Card.Title>Network Stats</Card.Title>
                  <div className="network-stats">
                    <div className="stat-item">
                      <span className="stat-label">Blocks:</span>
                      <span className="stat-value">{dashboardData.blockchainStats.blocks}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Difficulty:</span>
                      <span className="stat-value">{dashboardData.blockchainStats.difficulty}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Hash Rate:</span>
                      <span className="stat-value">{dashboardData.blockchainStats.hashRate} H/s</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline-primary" 
                    onClick={() => navigate('/blockchain')}
                  >
                    View Blockchain
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4}>
              <Card className="overview-card">
                <Card.Body>
                  <Card.Title>My Activity</Card.Title>
                  <div className="activity-stats">
                    <div className="stat-item">
                      <span className="stat-label">Transactions:</span>
                      <span className="stat-value">{dashboardData.userActivity.transactions}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Smart Contracts:</span>
                      <span className="stat-value">{dashboardData.userActivity.contracts}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Mining Rewards:</span>
                      <span className="stat-value">{dashboardData.userActivity.miningRewards} BCC</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline-primary" 
                    onClick={() => navigate('/transactions')}
                  >
                    View Transactions
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mt-4">
            <Col md={8}>
              <Card className="recent-activity">
                <Card.Header>Recent Transactions</Card.Header>
                <Card.Body>
                  {dashboardData.recentTransactions.length > 0 ? (
                    <div className="transaction-list">
                      {dashboardData.recentTransactions.map(tx => (
                        <div key={tx.id} className="transaction-item">
                          <div className="transaction-icon">
                            {tx.type === 'sent' ? 
                              <i className="fas fa-arrow-up text-danger"></i> :
                              <i className="fas fa-arrow-down text-success"></i>
                            }
                          </div>
                          <div className="transaction-details">
                            <div className="transaction-address">{tx.address}</div>
                            <div className="transaction-date">{new Date(tx.timestamp).toLocaleString()}</div>
                          </div>
                          <div className="transaction-amount">
                            {tx.type === 'sent' ? '-' : '+'}{tx.amount} BCC
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-data-message">No recent transactions</div>
                  )}
                  
                  <Button 
                    variant="link" 
                    className="view-all-link"
                    onClick={() => navigate('/transactions')}
                  >
                    View All Transactions
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4}>
              <Card className="quick-actions">
                <Card.Header>Quick Actions</Card.Header>
                <Card.Body>
                  <div className="action-buttons">
                    <Button 
                      variant="primary" 
                      className="action-button"
                      onClick={() => navigate('/transactions/create')}
                    >
                      <i className="fas fa-paper-plane"></i> Send BCC
                    </Button>
                    
                    <Button 
                      variant="success" 
                      className="action-button"
                      onClick={() => navigate('/mining')}
                    >
                      <i className="fas fa-hammer"></i> Start Mining
                    </Button>
                    
                    <Button 
                      variant="info" 
                      className="action-button"
                      onClick={() => navigate('/contracts/create')}
                    >
                      <i className="fas fa-file-contract"></i> Create Contract
                    </Button>
                    
                    <Button 
                      variant="warning" 
                      className="action-button"
                      onClick={() => navigate('/wallet/backup')}
                    >
                      <i className="fas fa-key"></i> Backup Wallet
                    </Button>
                  </div>
                </Card.Body>
              </Card>
              
              {user.role === 'admin' && (
                <Card className="admin-card mt-3">
                  <Card.Header>Admin Tools</Card.Header>
                  <Card.Body>
                    <Button 
                      variant="dark" 
                      className="admin-button"
                      onClick={() => navigate('/admin')}
                    >
                      <i className="fas fa-cog"></i> Admin Panel
                    </Button>
                  </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Dashboard;
