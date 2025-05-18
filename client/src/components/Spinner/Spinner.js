import React from 'react';
import './Spinner.css';

const Spinner = ({ size = 'medium', color = 'primary', fullPage = false }) => {
  const spinnerClasses = `spinner spinner-${size} spinner-${color} ${fullPage ? 'spinner-full-page' : ''}`;
  
  return (
    <div className={spinnerClasses}>
      <div className="spinner-border" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
};

export default Spinner;
