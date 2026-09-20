import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // /api 요청을 로컬 AI 프록시 서버(8787)로 전달.
    // 브라우저는 AI 게이트웨이를 직접 부르지 않고 우리 서버를 거칩니다.
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
