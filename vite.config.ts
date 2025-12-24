import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  
  server: {
    port: 5174,
    host: '0.0.0.0',
    allowedHosts: [
      'admin.seardao.org',
      '47.243.83.253',
      'localhost'
    ],
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
