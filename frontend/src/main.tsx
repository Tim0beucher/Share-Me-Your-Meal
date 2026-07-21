import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './auth/AuthContext';
import { applyAccent, getCachedAccent } from './theme';
import './styles.css';

// Appliqué avant le premier rendu pour éviter un flash de la couleur
// d'accent par défaut le temps que le profil soit rechargé depuis l'API.
applyAccent(getCachedAccent());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
