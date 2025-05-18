import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Secure, Decentralized Blockchain Platform</h1>
          <p className="hero-subtitle">
            A comprehensive blockchain solution with full cryptographic functionality
          </p>
          <div className="hero-cta">
            <Link to="/register" className="btn btn-primary btn-lg">Get Started</Link>
            <Link to="/explorer" className="btn btn-secondary btn-lg ml-2">Explore Blockchain</Link>
          </div>
        </div>
        <div className="hero-image">
          {/* Blockchain visualization image or component would go here */}
          <div className="blockchain-visualization">
            <div className="block block-1"></div>
            <div className="block block-2"></div>
            <div className="block block-3"></div>
            <div className="block block-4"></div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Core Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon wallet-icon"></div>
            <h3 className="feature-title">Wallet Management</h3>
            <p className="feature-description">
              Create and manage secure crypto wallets with QR code support and transaction history
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon blockchain-icon"></div>
            <h3 className="feature-title">Blockchain Explorer</h3>
            <p className="feature-description">
              View blocks, transactions, and addresses with real-time updates and search functionality
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon mining-icon"></div>
            <h3 className="feature-title">Mining Capability</h3>
            <p className="feature-description">
              Mine new blocks with PoW/PoS consensus algorithms and receive rewards
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon smartcontract-icon"></div>
            <h3 className="feature-title">Smart Contracts</h3>
            <p className="feature-description">
              Create, deploy, and execute smart contracts with automated testing and monitoring
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon security-icon"></div>
            <h3 className="feature-title">Advanced Security</h3>
            <p className="feature-description">
              Secure key management, digital signatures, and encryption using industry-standard algorithms
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon analytics-icon"></div>
            <h3 className="feature-title">Analytics & Reporting</h3>
            <p className="feature-description">
              Comprehensive analytics on transactions, blockchain statistics, and user activity
            </p>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3 className="step-title">Create an Account</h3>
            <p className="step-description">
              Sign up with secure email verification and enable two-factor authentication for enhanced security
            </p>
          </div>

          <div className="step">
            <div className="step-number">2</div>
            <h3 className="step-title">Create Your Wallet</h3>
            <p className="step-description">
              Generate your secure wallet with public and private keys, ready to send and receive transactions
            </p>
          </div>

          <div className="step">
            <div className="step-number">3</div>
            <h3 className="step-title">Explore the Blockchain</h3>
            <p className="step-description">
              Use the blockchain explorer to view blocks, transactions, and monitor network activity
            </p>
          </div>

          <div className="step">
            <div className="step-number">4</div>
            <h3 className="step-title">Start Mining or Create Contracts</h3>
            <p className="step-description">
              Mine new blocks to earn rewards or deploy smart contracts to automate transactions
            </p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2 className="cta-title">Ready to Get Started?</h2>
        <p className="cta-description">
          Join our blockchain platform today and experience the future of secure, decentralized transactions
        </p>
        <Link to="/register" className="btn btn-primary btn-lg">Create Your Account</Link>
      </section>
    </div>
  );
};

export default HomePage;
