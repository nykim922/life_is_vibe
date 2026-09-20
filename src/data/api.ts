// 백엔드(Express) API 클라이언트.
// 프론트/백엔드가 동일 도메인(운영: Nginx, 개발: Vite proxy)이므로 상대경로 사용.
// 세션 쿠키를 항상 포함하도록 credentials: 'include'.

export interface AuthState {
  authenticated: boolean
  googleConfigured: boolean
  user?: { email: string; name: string | null }
  calendarConnected?: boolean
}

export interface CreatedEventItem {
  kind: 'deadline' | 'event'
  eventId: string
  htmlLink: string
  duplicate: boolean
  appliedDefaultDuration?: boolean
}

export interface SkippedItem {
  kind: 'deadline' | 'event'
  reason: string
}

export interface CreateEventsResult {
  ok: boolean
  noticeId: string
  noticeTitle: string
  created: CreatedEventItem[]
  skipped: SkippedItem[]
}

export interface ServerScheduleItem {
  noticeId: string
  kind: 'deadline' | 'event'
  eventId: string
  htmlLink: string | null
  createdAt: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    const err = new Error(data?.message ?? `요청 실패 (${res.status})`) as Error & {
      status?: number
      body?: unknown
    }
    err.status = res.status
    err.body = data
    throw err
  }
  return data as T
}

/** 현재 인증 상태 조회 (세션 복원용) */
export function fetchAuthState(): Promise<AuthState> {
  return request<AuthState>('/api/auth/me')
}

/** 로그인 시작: 브라우저를 서버 OAuth 엔드포인트로 이동 */
export function startGoogleLogin(): void {
  window.location.href = '/api/auth/google'
}

/** 로그아웃: 서버 세션 무효화 */
export function logoutRequest(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
}

/** Google Calendar 이벤트 생성 요청 */
export function createCalendarEvents(input: {
  noticeId: string
  kinds: Array<'deadline' | 'event'>
  notify: 'none' | 'hour' | 'day'
}): Promise<CreateEventsResult> {
  return request<CreateEventsResult>('/api/calendar/events', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** 내가 생성한 캘린더 일정 목록 */
export function fetchCreatedEvents(): Promise<{ ok: boolean; items: ServerScheduleItem[] }> {
  return request<{ ok: boolean; items: ServerScheduleItem[] }>('/api/calendar/events')
}
