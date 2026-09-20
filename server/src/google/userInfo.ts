import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

export interface GoogleUserInfo {
  sub: string // 구글 고유 사용자 ID (안정적 식별자)
  email: string
  emailVerified: boolean
  name?: string
  picture?: string
}

/**
 * 인증된 클라이언트로 사용자 프로필을 조회한다.
 * 사용자 계정은 클라이언트가 보낸 이메일이 아니라, 이 서버 검증 결과로만 결정한다.
 */
export async function fetchUserInfo(client: OAuth2Client): Promise<GoogleUserInfo> {
  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const { data } = await oauth2.userinfo.get()
  if (!data.id || !data.email) {
    throw new Error('구글 사용자 정보를 가져오지 못했습니다.')
  }
  return {
    sub: data.id,
    email: data.email,
    emailVerified: Boolean(data.verified_email),
    name: data.name ?? undefined,
    picture: data.picture ?? undefined,
  }
}
