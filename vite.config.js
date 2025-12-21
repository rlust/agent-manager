import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/n8n-api': {
        target: 'http://ubuntullm.tail1f233.ts.net:5678',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/n8n-api/, '/api/v1')
      },
      '/n8n-webhook': {
        target: 'http://ubuntullm.tail1f233.ts.net:5678',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/n8n-webhook/, '/webhook')
      }
    }
  }
})
