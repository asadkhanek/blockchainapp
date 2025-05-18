import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Sidebar.css';

const Sidebar = () => {
  const { user } = useAuth();

  return (
    <div className="sidebar-container">
      <div className="user-info">
        <div className="user-avatar">
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt={`${user.username}'s avatar`} />
          ) : (
            <div className="avatar-placeholder">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </div>
        <div className="user-details">
          <h3 className="user-name">{user?.username || 'User'}</h3>
          <span className="user-role">{user?.role || 'user'}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          <li className="nav-section">
            <span className="section-title">Dashboard</span>
          </li>
          <li className="nav-item">
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <i className="nav-icon dashboard-icon"></i>
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/explorer" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <i className="nav-icon explorer-icon"></i>
              <span>Blockchain Explorer</span>
            </NavLink>
          </li>

          <li className="nav-section">
            <span className="section-title">Wallet</span>
          </li>
          <li className="nav-item">
            <NavLink to="/wallets" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <i className="nav-icon wallets-icon"></i>
              <span>My Wallets</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/send-transaction" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <i className="nav-icon send-icon"></i>
              <span>Send Transaction</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/transactions" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <i className="nav-icon transactions-icon"></i>
              <span>My Transactions</span>
            </NavLink>
          </li>

          <li className="nav-section">
            <span className="section-title">Smart Contracts</span>
          </li>
          <li className="nav-item">
            <NavLink to="/smart-contracts" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <i className="nav-icon contracts-icon"></i>
              <span>My Contracts</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/smart-contracts/create" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <i className="nav-icon create-contract-icon"></i>
              <span>Create Contract</span>
            </NavLink>
          </li>

          {(user?.role === 'miner' || user?.role === 'admin') && (
            <>
              <li className="nav-section">
                <span className="section-title">Mining</span>
              </li>
              <li className="nav-item">
                <NavLink to="/mining" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <i className="nav-icon mining-icon"></i>
                  <span>Mining Dashboard</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/mining/mine-block" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <i className="nav-icon mine-block-icon"></i>
                  <span>Mine Block</span>
                </NavLink>
              </li>
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <li className="nav-section">
                <span className="section-title">Administration</span>
              </li>
              <li className="nav-item">
                <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <i className="nav-icon admin-icon"></i>
                  <span>Admin Dashboard</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <i className="nav-icon users-icon"></i>
                  <span>Users</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/admin/network" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <i className="nav-icon network-icon"></i>
                  <span>Network</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/admin/system" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <i className="nav-icon system-icon"></i>
                  <span>System</span>
                </NavLink>
              </li>
            </>
          )}

          <li className="nav-section">
            <span className="section-title">Account</span>
          </li>
          <li className="nav-item">
            <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <i className="nav-icon profile-icon"></i>
              <span>My Profile</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/security" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <i className="nav-icon security-icon"></i>
              <span>Security</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
