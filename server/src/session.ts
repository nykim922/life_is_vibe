import session from 'express-session'
import type { RequestHandler } from 'express'
import FileStoreFactory from 'session-file-store'
import fs from 'fs'
import path from 'path'
import { config } from './config'

// 세션에 저장하는 최소 정보 (토큰은 세션이 아니라 tokenStore 에 별도 저장)
declare module 'express-session' {
  interface SessionData {
    userSub?: string
    email?: string
    name?: string
    // OAuth CSRF 방어용 state 값
    oauthState?: string
  }
}

const FileStore = FileStoreFactory(session)

const sessionsDir = path.join(config.sessionDbDir, 'sessions')
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true })
}

/**
 * 운영용 세션 저장소로 파일 기반 스토어를 사용한다(순수 JS, 네이티브 모듈 없음).
 * Express 기본 MemoryStore 를 쓰지 않으므로 프로세스 재시작에도 세션이 유지되고
 * 메모리 누수 경고가 없다. 단일 EC2 MVP 에 적합하다.
 */
export const sessionMiddleware: RequestHandler = session({
  name: 'cs.sid',
  store: new FileStore({
    path: sessionsDir,
    retries: 1,
    ttl: 7 * 24 * 60 * 60, // 7일(초)
    reapInterval: 60 * 60, // 만료 세션 정리 주기(초)
  }) as unknown as session.Store,
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true, // JS 접근 차단
    sameSite: 'lax', // CSRF 완화 (OAuth 리다이렉트와 호환)
    secure: config.isProd, // 운영(HTTPS)에서만 secure 쿠키
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    path: '/',
  },
})
