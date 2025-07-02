import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Puedes crear este archivo o dejarlo vacío si no lo necesitas
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);