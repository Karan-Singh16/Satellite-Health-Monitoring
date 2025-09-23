import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Use 127.0.0.1 to avoid the IPv6 ::1 issue on Windows
      '/api': 'http://127.0.0.1:8000',
    },
  },
})