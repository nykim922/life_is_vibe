import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config, googleConfigured } from './config'
import { sessionMiddleware } from './session'
import { authRouter } from './routes/auth'
import { calendarRouter } from './routes/calendar'

const app = express()

// Nginx 리버스 프록시 뒤에서 secure 쿠키/프로토콜 인식
app.set('trust proxy', 1)

app.use(
  helmet({
    // SPA 를 같은 도메인에서 서빙하므로 기본 보안 헤더만 적용
    contentSecurityPolicy: false,
  }),
)
app.use(express.json({ limit: '256kb' }))
app.use(cookieParser())
app.use(sessionMiddleware)

// 헬스체크 (Nginx/systemd 상태 확인용)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, googleConfigured, env: config.nodeEnv })
})

app.use('/api/auth', authRouter)
app.use('/api/calendar', calendarRouter)

// 알 수 없는 /api 경로
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' })
})

// 서버는 127.0.0.1 내부 포트에서만 수신 (외부 공개는 Nginx 담당)
app.listen(config.port, config.host, () => {
  console.log(
    `[server] 캠퍼스 비서 백엔드 실행 → http://${config.host}:${config.port} (env=${config.nodeEnv}, google=${googleConfigured ? 'on' : 'off'})`,
  )
})

export { app }
