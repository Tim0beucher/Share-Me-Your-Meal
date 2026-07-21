import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // écoute sur toutes les interfaces (0.0.0.0), pas juste localhost — nécessaire pour y accéder depuis un autre appareil du réseau local
  },
});
