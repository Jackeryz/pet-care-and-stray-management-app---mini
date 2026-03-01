import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';
import fs from 'fs';
import path from 'path';

function findFirstExisting(paths: Array<string | undefined>) {
  for (const candidate of paths) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

const sslKeyPath = findFirstExisting([
  process.env.VITE_SSL_KEY_PATH,
  path.resolve(process.cwd(), 'certs/localhost-key.pem'),
  path.resolve(process.cwd(), 'localhost-key.pem'),
  path.resolve(process.cwd(), '.cert/localhost-key.pem'),
]);

const sslCertPath = findFirstExisting([
  process.env.VITE_SSL_CERT_PATH,
  path.resolve(process.cwd(), 'certs/localhost.pem'),
  path.resolve(process.cwd(), 'localhost.pem'),
  path.resolve(process.cwd(), '.cert/localhost.pem'),
]);

const httpsForcedOff = process.env.VITE_USE_HTTPS === 'false';
const httpsForcedOn = process.env.VITE_USE_HTTPS === 'true';
const hasCerts = Boolean(sslKeyPath && sslCertPath);
const useHttps = httpsForcedOff ? false : httpsForcedOn || hasCerts;

if (httpsForcedOn && !hasCerts) {
  throw new Error(
    'VITE_USE_HTTPS=true but no certificate files found. Set VITE_SSL_KEY_PATH/VITE_SSL_CERT_PATH or place certs in certs/',
  );
}


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


const defaultBackendTarget = `${useHttps ? 'https' : 'http'}://localhost:3000`;


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
        target: process.env.VITE_BACKEND_URL || defaultBackendTarget,
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_BACKEND_URL || defaultBackendTarget,
        changeOrigin: true,
      },
    },
  },
});
