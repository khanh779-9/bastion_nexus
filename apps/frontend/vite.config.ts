import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = (env.VITE_BACKEND_URL || env.BACKEND_URL || '').trim().replace(/\/+$/, '');
  const port = parseInt(env.PORT || '5173', 10) || 5173;
  const proxy = backendUrl
    ? {
        '/api': {
          target: backendUrl,
          changeOrigin: true
        }
      }
    : undefined;

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'BACKEND_', 'FRONTEND_'],
    server: {
      port,
      proxy
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  };
});
