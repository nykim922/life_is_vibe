import { google } from 'googleapis'
import type { OAuth2Client, Credentials } from 'google-auth-library'
import { config, OAUTH_SCOPES, googleConfigured } from '../config'

/**
 * 요청마다 새 OAuth2 클라이언트를 만든다.
 * (사용자별 토큰을 세팅해서 사용하므로 공유하지 않는다.)
 */
export function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri,
  )
}

/** 동의 화면 URL 생성. state 로 CSRF 방어. */
export function buildAuthUrl(state: string): string {
  const client = createOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline', // refresh token 수령
    prompt: 'consent', // 최초 로그인 시 calendar 권한 동의 보장
    include_granted_scopes: true,
    scope: OAUTH_SCOPES,
    state,
  })
}

/** 인증 코드를 토큰으로 교환 */
export async function exchangeCode(code: string): Promise<Credentials> {
  const client = createOAuthClient()
  const { tokens } = await client.getToken(code)
  return tokens
}

/** 저장된 토큰으로 인증된 클라이언트를 만든다. */
export function clientFromTokens(tokens: Credentials): OAuth2Client {
  const client = createOAuthClient()
  client.setCredentials(tokens)
  return client
}

export { googleConfigured }
