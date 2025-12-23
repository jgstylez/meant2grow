import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// App initialization - no logging needed

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Root element found - no logging needed

import ErrorBoundary from './components/ErrorBoundary';

const root = ReactDOM.createRoot(rootElement);

// Rendering app - no logging needed

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// App render initiated - no logging needed