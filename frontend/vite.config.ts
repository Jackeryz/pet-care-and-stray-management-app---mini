import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';
import fs from 'fs';

const useHttps = process.env.VITE_USE_HTTPS === 'true';
const sslKeyPath = process.env.VITE_SSL_KEY_PATH;
const sslCertPath = process.env.VITE_SSL_CERT_PATH;

const httpsConfig =
  useHttps && sslKeyPath && sslCertPath
    ? {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      }
    : useHttps;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    host: '0.0.0.0',
    https: httpsConfig,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
