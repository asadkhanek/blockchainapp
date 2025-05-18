import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';
import Footer from '../Footer/Footer';
import './Layout.css';
import { useAuth } from '../../hooks/useAuth';

const Layout = () => {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="layout">
      <Navbar />
      
      <div className="main-container">
        {isAuthenticated && !loading && (
          <aside className="sidebar">
            <Sidebar />
          </aside>
        )}
        
        <main className={`main-content ${isAuthenticated ? 'with-sidebar' : ''}`}>
          <Outlet />
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default Layout;
