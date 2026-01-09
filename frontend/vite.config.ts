import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Vercel deploys at root, no need for /booksharepdx/
  resolve: {
    alias: {
      '@': '/src',
      '@booksharepdx/shared': '/node_modules/@booksharepdx/shared/src'
    }
  },
  server: {
    // Allow access from local network (mobile testing)
    host: true,
    // Proxy API requests to backend - solves CORS and cookie issues for local dev
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
