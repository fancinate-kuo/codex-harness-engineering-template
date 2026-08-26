import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 4318,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4317',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api/, '')
      },
      '/events': {
        target: 'http://127.0.0.1:4317',
        changeOrigin: true
      }
    }
  }
})
