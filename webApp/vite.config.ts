import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react({
      // Optimize React for production
      jsxRuntime: 'automatic',
      babel: {
        compact: true,
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Goodtime Pomodoro Timer',
        short_name: 'Goodtime',
        description: 'A minimalist but powerful productivity timer designed to keep you focused and free of distractions.',
        theme_color: '#ef4444',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    // Optimize for minimal resource usage
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Manual chunking to reduce memory usage
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react'],
          state: ['zustand']
        },
      },
    },
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Optimize assets
    assetsDir: 'assets',
    cssCodeSplit: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'lucide-react'],
  },
  server: {
    port: 3000,
    host: true
  },
  preview: {
    port: 3000,
    host: true
  }
});