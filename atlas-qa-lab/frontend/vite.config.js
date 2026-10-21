import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5176, proxy: { '/api': { target: process.env.API_URL || 'https://localhost:3443', secure: false } } },
})
