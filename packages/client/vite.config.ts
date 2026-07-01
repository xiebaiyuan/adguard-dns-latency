import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3080',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('recharts')) return 'vendor-charts'
          if (id.includes('phosphor-icons')) return 'vendor-icons'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
