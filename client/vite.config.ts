import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons.svg', 'login-bg.png', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'RestoPOS - Modern Point of Sale',
        short_name: 'RestoPOS',
        description: 'Professional Point of Sale and Lodging Management System',
        theme_color: '#2271b1',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'favicon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  build: {
    // Enable aggressive code splitting for faster page loads
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor bundle (loads once, cached)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI / animation libraries
          'vendor-ui': ['framer-motion', 'lucide-react', 'recharts'],
          // Data / utility libraries
          'vendor-data': ['@tanstack/react-query', 'axios', 'date-fns'],
          // PDF / export (lazy, only loaded when needed)
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          // Socket.io (only for real-time pages)
          'vendor-socket': ['socket.io-client'],
        }
      }
    },
    // Increase chunk size limit slightly for better batching
    chunkSizeWarningLimit: 600,
    // Minify CSS
    cssMinify: true,
    // Enable source maps only in dev
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
  },
})
