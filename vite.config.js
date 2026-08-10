import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import vike from 'vike/plugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devApiTarget = env.VITE_DEV_API_TARGET || 'https://api.umrahmarket.net';

  return {
    plugins: [react(), vike()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
          secure: devApiTarget.startsWith('https://'),
        },
      },
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none', 
      },
    },
  };
});