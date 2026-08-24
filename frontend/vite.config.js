import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/query': 'http://localhost:8000',
      '/query-multi': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/model-info': 'http://localhost:8000',
      '/gov-departments': 'http://localhost:8000',
      '/cross-modal-agreement': 'http://localhost:8000',
      '/change-stories': 'http://localhost:8000',
      '/change-story': 'http://localhost:8000',
    },
  },
})
