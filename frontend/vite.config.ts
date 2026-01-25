import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = process.env.VITE_API_TARGET || 'http://localhost:3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': '/src',
    }
  },
  server: {
    // Allow access from local network (mobile testing)
    host: true,
    // Proxy API requests to backend - solves CORS and cookie issues for local dev
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      }
    }
  }
})
