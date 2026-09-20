import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // 개발 중 /api 요청을 로컬 Express 백엔드(127.0.0.1:4000)로 프록시.
    // 이 백엔드 하나가 Google OAuth/Calendar(/api/auth, /api/calendar)와
    // AI 추천(/api/recommend, /api/health)을 모두 처리한다.
    // 운영에서는 Nginx 가 동일 도메인에서 /api 를 Express 로 전달하므로 CORS 불필요.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
})
