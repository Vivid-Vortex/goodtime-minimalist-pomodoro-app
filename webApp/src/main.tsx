import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('🚀 Starting Goodtime Pomodoro App...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

try {
  console.log('📝 Creating React root...');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('🎨 Rendering app...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  
  console.log('✅ App rendered successfully');
} catch (error) {
  console.error('❌ Failed to render app:', error);
  
  // Fallback error display
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h1 style="color: #ef4444;">Goodtime App Error</h1>
        <p>Failed to load the application.</p>
        <p style="color: #666; font-size: 12px;">Check console for details.</p>
        <button onclick="location.reload()" style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload App
        </button>
      </div>
    `;
  }
}