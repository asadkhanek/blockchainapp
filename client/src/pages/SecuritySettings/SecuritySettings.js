import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, InputGroup, Row, Col, Modal } from 'react-bootstrap';
import { fetchSecuritySettings, updatePassword, enable2FA, disable2FA, verifyTwoFactor } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/Spinner/Spinner';
import QRCode from 'qrcode.react';
import './SecuritySettings.css';

const SecuritySettings = () => {
  const [loading, setLoading] = useState(true);
  const [securitySettings, setSecuritySettings] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { user, updateUser } = useAuth();

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      setLoading(true);
      const settings = await fetchSecuritySettings();
      setSecuritySettings(settings);
      setEmailNotifications(settings.emailNotifications);
      setBrowserNotifications(settings.browserNotifications);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch security settings:', err);
      setError('Failed to load security settings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }
    
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordStrength < 3) {
      setError('Please choose a stronger password');
      return;
    }

    try {
      setLoading(true);
      await updatePassword(currentPassword, newPassword);
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated successfully');
    } catch (err) {
      console.error('Password update failed:', err);
      setError('Failed to update password. Please check your current password and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    try {
      setLoading(true);
      const result = await enable2FA();
      setTwoFactorSecret(result.secret);
      setShowTwoFactorModal(true);
    } catch (err) {
      console.error('Enable 2FA failed:', err);
      setError('Failed to enable two-factor authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setLoading(true);
      await disable2FA();
      
      // Update user in context
      updateUser({
        ...user,
        twoFactorEnabled: false
      });
      
      setSuccess('Two-factor authentication disabled successfully');
      loadSecuritySettings();
    } catch (err) {
      console.error('Disable 2FA failed:', err);
      setError('Failed to disable two-factor authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFactorCode) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setLoading(true);
      await verifyTwoFactor(twoFactorSecret, twoFactorCode);
      
      // Update user in context
      updateUser({
        ...user,
        twoFactorEnabled: true
      });
      
      setShowTwoFactorModal(false);
      setTwoFactorCode('');
      setTwoFactorSecret('');
      setSuccess('Two-factor authentication enabled successfully');
      
      loadSecuritySettings();
    } catch (err) {
      console.error('Verify 2FA failed:', err);
      setError('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotifications = async () => {
    try {
      setLoading(true);
      // API call would go here
      
      setSuccess('Notification preferences updated successfully');
    } catch (err) {
      console.error('Update notifications failed:', err);
      setError('Failed to update notification settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[^a-zA-Z0-9]+/)) strength++;
    
    setPasswordStrength(strength);
  };

  const getPasswordStrengthLabel = () => {
    switch(passwordStrength) {
      case 0:
      case 1:
        return 'Very Weak';
      case 2:
        return 'Weak';
      case 3:
        return 'Medium';
      case 4:
        return 'Strong';
      case 5:
        return 'Very Strong';
      default:
        return '';
    }
  };

  const getPasswordStrengthClass = () => {
    switch(passwordStrength) {
      case 0:
      case 1:
        return 'very-weak';
      case 2:
        return 'weak';
      case 3:
        return 'medium';
      case 4:
        return 'strong';
      case 5:
        return 'very-strong';
      default:
        return '';
    }
  };

  if (loading && !securitySettings) return <Spinner />;

  return (
    <div className="security-settings-container">
      <h1 className="security-title">Security Settings</h1>
      
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}
      
      <Row>
        <Col lg={6}>
          <Card className="settings-card">
            <Card.Header>
              <h5 className="mb-0">Password Management</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleUpdatePassword}>
                <Form.Group className="mb-3">
                  <Form.Label>Current Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        checkPasswordStrength(e.target.value);
                      }}
                    />
                    <Button 
                      variant="outline-secondary"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                    </Button>
                  </InputGroup>
                </Form.Group>
                
                {newPassword && (
                  <div className="password-strength mb-3">
                    <div className="strength-label">
                      Password Strength: <span className={getPasswordStrengthClass()}>{getPasswordStrengthLabel()}</span>
                    </div>
                    <div className="strength-meter">
                      <div 
                        className={`strength-progress ${getPasswordStrengthClass()}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                <Form.Group className="mb-3">
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  type="submit"
                  disabled={loading}
                >
                  Update Password
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={6}>
          <Card className="settings-card">
            <Card.Header>
              <h5 className="mb-0">Two-Factor Authentication</h5>
            </Card.Header>
            <Card.Body>
              <div className="two-factor-status">
                <div>
                  <h6>Status:</h6>
                  <p className={user?.twoFactorEnabled ? 'text-success' : 'text-danger'}>
                    {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                {user?.twoFactorEnabled ? (
                  <Button 
                    variant="danger" 
                    onClick={handleDisable2FA}
                    disabled={loading}
                  >
                    Disable
                  </Button>
                ) : (
                  <Button 
                    variant="success" 
                    onClick={handleEnable2FA}
                    disabled={loading}
                  >
                    Enable
                  </Button>
                )}
              </div>
              
              <hr />
              
              <div className="info-text">
                <i className="fas fa-shield-alt"></i>
                <div>
                  <h6>Why Use Two-Factor Authentication?</h6>
                  <p>
                    Two-factor authentication adds an extra layer of security to your account.
                    After enabling, you'll need both your password and access to your phone
                    to log in to your account.
                  </p>
                </div>
              </div>
              
              <div className="app-list">
                <h6>Recommended Apps:</h6>
                <ul>
                  <li>Google Authenticator</li>
                  <li>Authy</li>
                  <li>Microsoft Authenticator</li>
                </ul>
              </div>
            </Card.Body>
          </Card>
          
          <Card className="settings-card mt-4">
            <Card.Header>
              <h5 className="mb-0">Notification Preferences</h5>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="email-switch"
                    label="Email Notifications"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                  />
                  <Form.Text className="text-muted">
                    Receive notifications about important security events
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="browser-switch"
                    label="Browser Notifications"
                    checked={browserNotifications}
                    onChange={(e) => setBrowserNotifications(e.target.checked)}
                  />
                  <Form.Text className="text-muted">
                    Receive browser push notifications
                  </Form.Text>
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  onClick={handleUpdateNotifications}
                  disabled={loading}
                >
                  Save Preferences
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Card className="settings-card mt-4">
        <Card.Header>
          <h5 className="mb-0">Session Management</h5>
        </Card.Header>
        <Card.Body>
          <div className="session-info">
            <h6>Current Session</h6>
            <div className="session-details">
              <div className="detail-item">
                <span className="label">Browser:</span>
                <span className="value">{securitySettings?.currentSession.browser}</span>
              </div>
              <div className="detail-item">
                <span className="label">IP Address:</span>
                <span className="value">{securitySettings?.currentSession.ip}</span>
              </div>
              <div className="detail-item">
                <span className="label">Location:</span>
                <span className="value">{securitySettings?.currentSession.location}</span>
              </div>
              <div className="detail-item">
                <span className="label">Last Activity:</span>
                <span className="value">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <hr />
          
          <h6>Active Sessions</h6>
          {securitySettings?.activeSessions.length > 0 ? (
            <div className="sessions-list">
              {securitySettings.activeSessions.map((session, index) => (
                <div key={index} className="session-item">
                  <div className="session-info">
                    <div className="session-icon">
                      <i className={session.device === 'Mobile' ? 'fas fa-mobile-alt' : 'fas fa-laptop'}></i>
                    </div>
                    <div className="session-details">
                      <div className="session-device">{session.device} - {session.browser}</div>
                      <div className="session-meta">
                        <span>{session.ip}</span>
                        <span>•</span>
                        <span>{session.location}</span>
                        <span>•</span>
                        <span>Last active: {new Date(session.lastActive).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => alert('This would terminate the session')}
                  >
                    Terminate
                  </Button>
                </div>
              ))}
              
              <div className="mt-3">
                <Button 
                  variant="danger" 
                  onClick={() => alert('This would terminate all other sessions')}
                >
                  <i className="fas fa-sign-out-alt"></i> Terminate All Other Sessions
                </Button>
              </div>
            </div>
          ) : (
            <div className="no-data-message">No other active sessions</div>
          )}
        </Card.Body>
      </Card>
      
      {/* Two-Factor Setup Modal */}
      <Modal 
        show={showTwoFactorModal} 
        onHide={() => setShowTwoFactorModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Setup Two-Factor Authentication</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="two-factor-setup">
            <div className="setup-step">
              <h6>Step 1: Scan this QR code with your authentication app</h6>
              <div className="qr-container">
                {twoFactorSecret && (
                  <QRCode 
                    value={`otpauth://totp/BlockchainApp:${user?.email}?secret=${twoFactorSecret}&issuer=BlockchainApp`} 
                    size={200} 
                    level="H"
                  />
                )}
              </div>
              
              <div className="manual-key">
                <div>Or enter this key manually:</div>
                <div className="key-value">{twoFactorSecret}</div>
              </div>
            </div>
            
            <div className="setup-step">
              <h6>Step 2: Enter the verification code from your app</h6>
              <InputGroup className="mb-3">
                <Form.Control
                  type="text"
                  placeholder="6-digit code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  maxLength={6}
                  pattern="[0-9]*"
                />
                <Button 
                  variant="primary"
                  onClick={handleVerify2FA}
                  disabled={loading || !twoFactorCode}
                >
                  Verify
                </Button>
              </InputGroup>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowTwoFactorModal(false)}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SecuritySettings;
