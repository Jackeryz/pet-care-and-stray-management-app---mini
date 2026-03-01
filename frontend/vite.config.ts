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
<<<<<<< ours
  path.resolve(process.cwd(), 'localhost-key.pem'),
  path.resolve(process.cwd(), '.cert/localhost-key.pem'),
=======
  path.resolve(process.cwd(), 'certs/localhost+1-key.pem'),
  path.resolve(process.cwd(), 'cert/localhost-key.pem'),
  path.resolve(process.cwd(), 'cert/localhost+1-key.pem'),
  path.resolve(process.cwd(), '../backend/certs/localhost-key.pem'),
  path.resolve(process.cwd(), '../backend/certs/localhost+1-key.pem'),
  path.resolve(process.cwd(), '../backend/cert/localhost-key.pem'),
  path.resolve(process.cwd(), '../backend/cert/localhost+1-key.pem'),
  path.resolve(process.cwd(), 'localhost-key.pem'),
  path.resolve(process.cwd(), 'localhost+1-key.pem'),
  path.resolve(process.cwd(), '.cert/localhost-key.pem'),
  path.resolve(process.cwd(), '.cert/localhost+1-key.pem'),
>>>>>>> theirs
]);

const sslCertPath = findFirstExisting([
  process.env.VITE_SSL_CERT_PATH,
  path.resolve(process.cwd(), 'certs/localhost.pem'),
<<<<<<< ours
  path.resolve(process.cwd(), 'localhost.pem'),
  path.resolve(process.cwd(), '.cert/localhost.pem'),
=======
  path.resolve(process.cwd(), 'certs/localhost+1.pem'),
  path.resolve(process.cwd(), 'cert/localhost.pem'),
  path.resolve(process.cwd(), 'cert/localhost+1.pem'),
  path.resolve(process.cwd(), '../backend/certs/localhost.pem'),
  path.resolve(process.cwd(), '../backend/certs/localhost+1.pem'),
  path.resolve(process.cwd(), '../backend/cert/localhost.pem'),
  path.resolve(process.cwd(), '../backend/cert/localhost+1.pem'),
  path.resolve(process.cwd(), 'localhost.pem'),
  path.resolve(process.cwd(), 'localhost+1.pem'),
  path.resolve(process.cwd(), '.cert/localhost.pem'),
  path.resolve(process.cwd(), '.cert/localhost+1.pem'),
>>>>>>> theirs
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

const httpsConfig =
  useHttps && sslKeyPath && sslCertPath
    ? {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      }
    : useHttps;

const defaultBackendTarget = `${useHttps ? 'https' : 'http'}://localhost:3000`;
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours

=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs

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
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',        
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',        
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
        target: process.env.VITE_BACKEND_URL || defaultBackendTarget,
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_BACKEND_URL || defaultBackendTarget,
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
        changeOrigin: true,
      },
    },
  },
});
