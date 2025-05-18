import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-row">
          <div className="footer-column">
            <h4 className="footer-title">BlockchainApp</h4>
            <p className="footer-description">
              A secure, scalable, and decentralized blockchain platform for the future of digital transactions.
            </p>
          </div>
          
          <div className="footer-column">
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/explorer">Blockchain Explorer</Link>
              </li>
              <li>
                <Link to="/dashboard">Dashboard</Link>
              </li>
              <li>
                <Link to="/wallets">Wallets</Link>
              </li>
            </ul>
          </div>
          
          <div className="footer-column">
            <h4 className="footer-title">Resources</h4>
            <ul className="footer-links">
              <li>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  GitHub Repository
                </a>
              </li>
              <li>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  Community Forum
                </a>
              </li>
            </ul>
          </div>
          
          <div className="footer-column">
            <h4 className="footer-title">Contact Us</h4>
            <p>
              <i className="contact-icon email-icon"></i> contact@blockchainapp.com
            </p>
            <p>
              <i className="contact-icon github-icon"></i> <a href="#" target="_blank" rel="noopener noreferrer">GitHub</a>
            </p>
            <p>
              <i className="contact-icon twitter-icon"></i> <a href="#" target="_blank" rel="noopener noreferrer">Twitter</a>
            </p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="copyright">
            &copy; {new Date().getFullYear()} BlockchainApp. All rights reserved.
          </div>
          <div className="footer-bottom-links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
