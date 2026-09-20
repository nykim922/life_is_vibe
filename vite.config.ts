import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // 개발 중 /api 요청을 통합 Express 백엔드로 전달.
    // 운영에서는 Nginx가 같은 경로를 127.0.0.1:8787로 프록시한다.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
