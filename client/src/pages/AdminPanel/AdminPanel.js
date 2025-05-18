import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Table, Alert, Badge, Modal, Tabs, Tab } from 'react-bootstrap';
import { fetchAdminStats, fetchUserList, updateUserRole, fetchNetworkNodes, updateBlockchainConfig } from '../../utils/api';
import Spinner from '../../components/Spinner/Spinner';
import './AdminPanel.css';

const AdminPanel = () => {
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [blockchainConfig, setBlockchainConfig] = useState({
    blockTime: 0,
    difficulty: 0,
    reward: 0,
    feePercent: 0
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    loadAdminData();
  }, [activeTab]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      const stats = await fetchAdminStats();
      setAdminStats(stats);
      
      if (activeTab === 'users') {
        const userData = await fetchUserList();
        setUsers(userData);
      } else if (activeTab === 'network') {
        const nodeData = await fetchNetworkNodes();
        setNodes(nodeData);
        
        // Update blockchain config
        setBlockchainConfig({
          blockTime: stats.blockchainConfig.blockTime,
          difficulty: stats.blockchainConfig.difficulty,
          reward: stats.blockchainConfig.reward,
          feePercent: stats.blockchainConfig.feePercent
        });
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setError('Failed to load admin data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const openUserModal = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      setLoading(true);
      await updateUserRole(userId, newRole);
      
      setShowUserModal(false);
      setSuccess('User role updated successfully');
      
      // Reload user list
      if (activeTab === 'users') {
        const userData = await fetchUserList();
        setUsers(userData);
      }
    } catch (err) {
      console.error('Update user role failed:', err);
      setError('Failed to update user role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBlockchainConfig = async () => {
    try {
      setLoading(true);
      await updateBlockchainConfig(blockchainConfig);
      
      setShowConfigModal(false);
      setSuccess('Blockchain configuration updated successfully');
      
      // Reload admin stats
      const stats = await fetchAdminStats();
      setAdminStats(stats);
    } catch (err) {
      console.error('Update blockchain config failed:', err);
      setError('Failed to update blockchain configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !adminStats) return <Spinner />;

  return (
    <div className="admin-panel-container">
      <h1 className="admin-title">Admin Panel</h1>
      
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="dashboard" title="Dashboard">
          <Row>
            <Col md={3}>
              <Card className="stat-card">
                <Card.Body>
                  <div className="stat-icon">
                    <i className="fas fa-users"></i>
                  </div>
                  <div className="stat-details">
                    <h3>{adminStats?.userStats.totalUsers}</h3>
                    <p>Total Users</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stat-card">
                <Card.Body>
                  <div className="stat-icon">
                    <i className="fas fa-cubes"></i>
                  </div>
                  <div className="stat-details">
                    <h3>{adminStats?.blockchainStats.totalBlocks}</h3>
                    <p>Total Blocks</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stat-card">
                <Card.Body>
                  <div className="stat-icon">
                    <i className="fas fa-exchange-alt"></i>
                  </div>
                  <div className="stat-details">
                    <h3>{adminStats?.blockchainStats.totalTransactions}</h3>
                    <p>Total Transactions</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="stat-card">
                <Card.Body>
                  <div className="stat-icon">
                    <i className="fas fa-file-contract"></i>
                  </div>
                  <div className="stat-details">
                    <h3>{adminStats?.blockchainStats.totalContracts}</h3>
                    <p>Smart Contracts</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row className="mt-4">
            <Col md={6}>
              <Card className="chart-card">
                <Card.Header>User Registration</Card.Header>
                <Card.Body>
                  <div className="chart-placeholder">
                    <p>User growth chart would appear here</p>
                    <p className="text-muted">Data visualization requires additional libraries</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="chart-card">
                <Card.Header>Transaction Volume</Card.Header>
                <Card.Body>
                  <div className="chart-placeholder">
                    <p>Transaction volume chart would appear here</p>
                    <p className="text-muted">Data visualization requires additional libraries</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row className="mt-4">
            <Col md={6}>
              <Card className="info-card">
                <Card.Header>System Status</Card.Header>
                <Card.Body>
                  <Table bordered size="sm">
                    <tbody>
                      <tr>
                        <td>Service Status:</td>
                        <td>
                          <Badge bg="success">Online</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td>Current Block:</td>
                        <td>{adminStats?.blockchainStats.latestBlock}</td>
                      </tr>
                      <tr>
                        <td>Network Difficulty:</td>
                        <td>{adminStats?.blockchainStats.currentDifficulty}</td>
                      </tr>
                      <tr>
                        <td>Average Block Time:</td>
                        <td>{adminStats?.blockchainStats.averageBlockTime} seconds</td>
                      </tr>
                      <tr>
                        <td>Active Nodes:</td>
                        <td>{adminStats?.networkStats.activeNodes}</td>
                      </tr>
                      <tr>
                        <td>Memory Usage:</td>
                        <td>{adminStats?.systemStats.memoryUsage} MB</td>
                      </tr>
                      <tr>
                        <td>Uptime:</td>
                        <td>{adminStats?.systemStats.uptime} hours</td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="info-card">
                <Card.Header>System Actions</Card.Header>
                <Card.Body>
                  <div className="admin-actions">
                    <Button 
                      variant="primary" 
                      className="action-button"
                      onClick={() => setShowConfigModal(true)}
                    >
                      <i className="fas fa-cogs"></i> Blockchain Configuration
                    </Button>
                    <Button 
                      variant="warning" 
                      className="action-button"
                      onClick={() => alert('This would restart the blockchain service')}
                    >
                      <i className="fas fa-sync-alt"></i> Restart Blockchain Service
                    </Button>
                    <Button 
                      variant="info" 
                      className="action-button"
                      onClick={() => alert('This would backup the blockchain')}
                    >
                      <i className="fas fa-download"></i> Backup Blockchain
                    </Button>
                    <Button 
                      variant="danger" 
                      className="action-button"
                      onClick={() => alert('This would perform blockchain maintenance')}
                    >
                      <i className="fas fa-tools"></i> Maintenance Mode
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        
        <Tab eventKey="users" title="User Management">
          <Card className="users-card">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Registered Users</h5>
                <div className="search-container">
                  <Form.Control
                    type="text"
                    placeholder="Search users..."
                    className="search-input"
                  />
                </div>
              </div>
              
              {loading ? (
                <Spinner />
              ) : (
                <div className="table-responsive">
                  <Table hover className="users-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Registration Date</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="user-row">
                          <td>{user.username}</td>
                          <td>{user.email}</td>
                          <td>
                            <Badge bg={
                              user.role === 'admin' ? 'danger' :
                              user.role === 'miner' ? 'warning' :
                              'primary'
                            }>
                              {user.role}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={user.active ? 'success' : 'secondary'}>
                              {user.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td>
                          <td>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="action-btn"
                              onClick={() => openUserModal(user)}
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button 
                              variant={user.active ? "danger" : "success"} 
                              size="sm" 
                              className="action-btn"
                              onClick={() => alert(`This would ${user.active ? 'deactivate' : 'activate'} the user account`)}
                            >
                              <i className={user.active ? "fas fa-ban" : "fas fa-check"}></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="network" title="Network Management">
          <Card className="network-card mb-4">
            <Card.Header>Blockchain Configuration</Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Table bordered size="sm">
                    <tbody>
                      <tr>
                        <td>Block Time Target:</td>
                        <td>{adminStats?.blockchainConfig.blockTime} seconds</td>
                      </tr>
                      <tr>
                        <td>Current Difficulty:</td>
                        <td>{adminStats?.blockchainConfig.difficulty}</td>
                      </tr>
                      <tr>
                        <td>Mining Reward:</td>
                        <td>{adminStats?.blockchainConfig.reward} BCC</td>
                      </tr>
                      <tr>
                        <td>Transaction Fee Percent:</td>
                        <td>{adminStats?.blockchainConfig.feePercent}%</td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
                <Col md={6} className="d-flex align-items-center justify-content-end">
                  <Button 
                    variant="primary" 
                    onClick={() => setShowConfigModal(true)}
                  >
                    <i className="fas fa-cogs"></i> Update Configuration
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
          
          <Card className="network-card">
            <Card.Header>Network Nodes</Card.Header>
            <Card.Body>
              {loading ? (
                <Spinner />
              ) : (
                <div className="table-responsive">
                  <Table hover className="nodes-table">
                    <thead>
                      <tr>
                        <th>Node ID</th>
                        <th>Host</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Last Seen</th>
                        <th>Version</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nodes.map(node => (
                        <tr key={node.id} className="node-row">
                          <td>{node.id.substring(0, 8)}...</td>
                          <td>{node.host}</td>
                          <td>
                            <Badge bg={
                              node.type === 'full' ? 'primary' :
                              node.type === 'mining' ? 'warning' :
                              'info'
                            }>
                              {node.type}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={node.active ? 'success' : 'danger'}>
                              {node.active ? 'Online' : 'Offline'}
                            </Badge>
                          </td>
                          <td>{new Date(node.lastSeen).toLocaleString()}</td>
                          <td>{node.version}</td>
                          <td>
                            <Button 
                              variant="info" 
                              size="sm" 
                              className="action-btn"
                              onClick={() => alert('This would show node details')}
                            >
                              <i className="fas fa-info-circle"></i>
                            </Button>
                            <Button 
                              variant={node.trusted ? "warning" : "success"} 
                              size="sm" 
                              className="action-btn"
                              onClick={() => alert(`This would ${node.trusted ? 'remove' : 'add'} the node from trusted nodes`)}
                            >
                              <i className={node.trusted ? "fas fa-star-half-alt" : "fas fa-star"}></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
              
              <div className="mt-3 d-flex justify-content-end">
                <Button 
                  variant="outline-primary"
                  onClick={() => alert('This would add a new node to the network')}
                >
                  <i className="fas fa-plus"></i> Add Node
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
      
      {/* Edit User Modal */}
      <Modal 
        show={showUserModal} 
        onHide={() => setShowUserModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit User: {selectedUser?.username}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>User Role</Form.Label>
                <Form.Select 
                  value={selectedUser.role}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    role: e.target.value
                  })}
                >
                  <option value="user">User</option>
                  <option value="miner">Miner</option>
                  <option value="admin">Admin</option>
                </Form.Select>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Account Status</Form.Label>
                <Form.Check 
                  type="switch"
                  id="active-switch"
                  label="Active Account"
                  checked={selectedUser.active}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    active: e.target.checked
                  })}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Account Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Admin notes about this user"
                  value={selectedUser.notes || ''}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    notes: e.target.value
                  })}
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowUserModal(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={() => handleUpdateUserRole(selectedUser.id, selectedUser.role)}
            disabled={loading}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Blockchain Config Modal */}
      <Modal 
        show={showConfigModal} 
        onHide={() => setShowConfigModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Blockchain Configuration</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Block Time Target (seconds)</Form.Label>
              <Form.Control
                type="number"
                min="10"
                step="1"
                value={blockchainConfig.blockTime}
                onChange={(e) => setBlockchainConfig({
                  ...blockchainConfig,
                  blockTime: parseInt(e.target.value)
                })}
              />
              <Form.Text className="text-muted">
                Target time for creating new blocks
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Mining Difficulty</Form.Label>
              <Form.Control
                type="number"
                min="1"
                step="1"
                value={blockchainConfig.difficulty}
                onChange={(e) => setBlockchainConfig({
                  ...blockchainConfig,
                  difficulty: parseInt(e.target.value)
                })}
              />
              <Form.Text className="text-muted">
                Higher values make mining more difficult
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Mining Reward (BCC)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.1"
                value={blockchainConfig.reward}
                onChange={(e) => setBlockchainConfig({
                  ...blockchainConfig,
                  reward: parseFloat(e.target.value)
                })}
              />
              <Form.Text className="text-muted">
                Reward for successfully mining a block
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Transaction Fee Percent</Form.Label>
              <Form.Control
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={blockchainConfig.feePercent}
                onChange={(e) => setBlockchainConfig({
                  ...blockchainConfig,
                  feePercent: parseFloat(e.target.value)
                })}
              />
              <Form.Text className="text-muted">
                Default fee percentage for transactions
              </Form.Text>
            </Form.Group>
          </Form>
          
          <Alert variant="warning" className="mt-3">
            <i className="fas fa-exclamation-triangle"></i> Changes to blockchain configuration may affect network performance and security
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowConfigModal(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUpdateBlockchainConfig}
            disabled={loading}
          >
            Update Configuration
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminPanel;
