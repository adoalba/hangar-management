
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env': {}
  },
  server: {
    port: 8080,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      // Regla única y robusta que redirige todas las llamadas /api al backend
      '/api': {
        target: 'http://127.0.0.1:5000', // Explicit IPv4 to avoid Node v17+ IPv6 resolution issues
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    cssMinify: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react'],
          charts: ['recharts'],
          scanner: ['html5-qrcode'],
        },
      },
    },
  },
});