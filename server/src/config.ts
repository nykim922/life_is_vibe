import dotenv from 'dotenv'
import path from 'path'

// 서버 루트의 .env 로드 (server/.env)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback
  if (v === undefined || v === '') {
    // OAuth 자격증명이 없어도 서버는 뜨되, 로그인 시도 시 명확히 실패하도록 경고만 남긴다.
    // (해커톤 MVP: Google Cloud 설정 전에도 UI/헬스체크가 동작해야 함)
    console.warn(`[config] 환경변수 ${name} 가 설정되지 않았습니다. Google 로그인 기능은 비활성화됩니다.`)
    return ''
  }
  return v
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Express 는 127.0.0.1 내부 포트에서만 수신 (Nginx 리버스 프록시가 앞단)
  host: process.env.HOST ?? '127.0.0.1',
  port: Number(process.env.PORT ?? 4000),

  // 세션
  sessionSecret: required('SESSION_SECRET', 'dev-insecure-secret-change-me'),
  sessionDbDir: process.env.SESSION_DB_DIR ?? path.resolve(__dirname, '..', 'data'),

  // 프론트엔드가 서비스되는 공개 오리진 (동일 도메인 권장)
  // 예: https://campus.example.com  (개발: http://localhost:5173)
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:5173',

  // Google OAuth
  google: {
    clientId: required('GOOGLE_CLIENT_ID'),
    clientSecret: required('GOOGLE_CLIENT_SECRET'),
    // Google Cloud Console 에 등록한 Redirect URI 와 반드시 일치해야 한다.
    // 예: https://campus.example.com/api/auth/google/callback
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ??
      'http://localhost:5173/api/auth/google/callback',
  },

  // 로그인 후 프론트로 복귀할 경로 (SPA 루트)
  postLoginRedirect: process.env.POST_LOGIN_REDIRECT ?? '/',
}

// 실제 Google 로그인 사용 가능 여부
export const googleConfigured = Boolean(
  config.google.clientId && config.google.clientSecret,
)

export const OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
]
