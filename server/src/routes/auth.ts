import { Router } from 'express'
import crypto from 'crypto'
import { config, googleConfigured, OAUTH_SCOPES } from '../config'
import {
  buildAuthUrl,
  exchangeCode,
  clientFromTokens,
} from '../google/oauthClient'
import { fetchUserInfo } from '../google/userInfo'
import { upsertUserTokens, getUser, deleteUser } from '../store/tokenStore'

export const authRouter = Router()

/** 현재 인증 상태 조회. 프론트가 최초 로딩/새로고침 때 세션을 복원하는 데 사용. */
authRouter.get('/me', (req, res) => {
  const sub = req.session.userSub
  if (!sub) {
    res.json({ authenticated: false, googleConfigured })
    return
  }
  const user = getUser(sub)
  if (!user) {
    req.session.destroy(() => {
      res.json({ authenticated: false, googleConfigured })
    })
    return
  }
  const calendarConnected = (user.tokens.scope ?? '').split(' ').includes(
    'https://www.googleapis.com/auth/calendar.events',
  )
  res.json({
    authenticated: true,
    googleConfigured,
    user: {
      email: user.email,
      name: user.name ?? null,
    },
    // 캘린더 권한 상태: 로그인 시 calendar.events scope 를 함께 요청/수락했으므로 true
    calendarConnected,
  })
})

/**
 * 로그인 시작. state 를 세션에 저장(세션 고정/CSRF 방어)하고 구글 동의 화면으로 리다이렉트.
 * 프론트의 "구글로 로그인" 버튼은 이 URL 로 브라우저를 이동시킨다.
 */
authRouter.get('/google', (req, res) => {
  if (!googleConfigured) {
    res
      .status(503)
      .json({ error: 'google_not_configured', message: 'Google OAuth 자격증명이 서버에 설정되지 않았습니다.' })
    return
  }
  // 세션 고정 방어: 로그인 흐름 시작 시 세션을 새로 발급
  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ error: 'session_error' })
      return
    }
    const state = crypto.randomBytes(24).toString('hex')
    req.session.oauthState = state
    req.session.save(() => {
      res.redirect(buildAuthUrl(state))
    })
  })
})

/**
 * OAuth 콜백. state 검증 → 코드 교환 → 사용자 정보 검증 → 세션 생성 → 앱으로 복귀.
 */
authRouter.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query as {
    code?: string
    state?: string
    error?: string
  }

  const redirectToApp = (query: string) =>
    res.redirect(`${config.postLoginRedirect}${query}`)

  if (error) {
    redirectToApp('?login=denied')
    return
  }
  // state 검증 (CSRF)
  if (!state || !req.session.oauthState || state !== req.session.oauthState) {
    redirectToApp('?login=state_mismatch')
    return
  }
  delete req.session.oauthState

  if (!code) {
    redirectToApp('?login=no_code')
    return
  }

  try {
    const tokens = await exchangeCode(code)
    const client = clientFromTokens(tokens)
    const info = await fetchUserInfo(client)

    if (!info.emailVerified) {
      redirectToApp('?login=email_unverified')
      return
    }

    // 서버 측에 토큰 저장 (세션 고정 방어: 로그인 성공 시 세션 재생성)
    upsertUserTokens({
      sub: info.sub,
      email: info.email,
      name: info.name,
      tokens,
    })

    req.session.regenerate((regenErr) => {
      if (regenErr) {
        redirectToApp('?login=session_error')
        return
      }
      req.session.userSub = info.sub
      req.session.email = info.email
      req.session.name = info.name
      req.session.save(() => {
        // 로그인 성공 → 앱으로 복귀 (온보딩/프로필 화면은 프론트가 판단)
        redirectToApp('?login=success')
      })
    })
  } catch (e) {
    console.error('[auth] callback 실패') // OAuth 오류 객체에는 비밀값이 포함될 수 있음
    redirectToApp('?login=error')
  }
})

/** 로그아웃: 서버 세션 무효화. (토큰 기록은 유지 — 재로그인 시 재사용) */
authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('cs.sid', { path: '/' })
    res.json({ ok: true })
  })
})

/** 계정 연결 해제(선택): 서버 토큰까지 삭제. 프로필 데이터는 클라이언트가 별도 관리. */
authRouter.post('/disconnect', (req, res) => {
  const sub = req.session.userSub
  if (sub) deleteUser(sub)
  req.session.destroy(() => {
    res.clearCookie('cs.sid', { path: '/' })
    res.json({ ok: true })
  })
})
