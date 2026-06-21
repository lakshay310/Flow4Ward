import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_PORT = process.env.VITE_BACKEND_PORT || '5000';
const BACKEND_URL  = `http://localhost:${BACKEND_PORT}`;

export default defineConfig({
  plugins: [react()],
  server: {
    // port passed via CLI --port flag from start.js
    proxy: {
      '/api':      { target: BACKEND_URL, changeOrigin: true },
      '/socket.io': { target: BACKEND_URL, ws: true, changeOrigin: true },
    },
  },
})
