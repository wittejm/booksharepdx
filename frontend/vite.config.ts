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
  }
})
