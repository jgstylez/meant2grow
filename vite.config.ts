import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables from .env files (local) or Vercel environment (production)
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // Note: Gemini API key is now stored securely in Firebase Functions secrets
      // No longer exposed in client bundle
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            // React and core dependencies
            'react-vendor': ['react', 'react-dom'],
            // Firebase services
            'firebase': [
              'firebase/app',
              'firebase/firestore',
              'firebase/auth',
              'firebase/storage'
            ],
            // Chart library
            'charts': ['recharts'],
            // Icons
            'icons': ['lucide-react'],
            // Google services
            'google-services': ['googleapis'],
            // Heavy components
            'chat': ['./components/Chat'],
            'dashboard': ['./components/Dashboard'],
            'settings': ['./components/SettingsView']
          }
        }
      }
    }
  };
});
