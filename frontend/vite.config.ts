import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';
import fs from 'fs';
import path from 'path';

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
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'cert/localhost+1-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'cert/localhost+1.pem')),
    },
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'https://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: process.env.VITE_BACKEND_URL || 'https://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

