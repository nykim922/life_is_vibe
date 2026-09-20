import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppState,
  AuthSlice,
  GoogleEvent,
  Notice,
  NotifyOption,
  Profile,
  ScheduleItem,
  ScheduleKind,
} from './data/types'
import { emptyState, loadState, saveState, clearState } from './data/storage'
import { buildGoogleEvents } from './data/notices'
import { REAL_NOTICES } from './data/adaptNotices'
import {
  createCalendarEvents,
  fetchAuthState,
  fetchCreatedEvents,
  logoutRequest,
  startGoogleLogin,
  type CreateEventsResult,
} from './data/api'

export interface AddScheduleOutcome {
  ok: boolean
  result?: CreateEventsResult
  error?: string
}

interface StoreValue {
  state: AppState
  auth: AuthSlice
  notices: Notice[]
  googleEvents: GoogleEvent[] // 데모 예시 일정(실제 구글 계정 아님)

  // 로그인 (실제 Google OAuth)
  loginWithGoogle: () => void
  logout: () => Promise<void>

  // 온보딩/프로필
  completeOnboarding: (profile: Profile) => void
  updateProfile: (profile: Profile) => void

  // 저장
  toggleSave: (id: string) => void
  isSaved: (id: string) => boolean

  // 숨김
  hide: (id: string) => void
  unhide: (id: string) => void
  resetHidden: () => void

  // 일정 (실제 Google Calendar 연동)
  addSchedule: (
    notice: Notice,
    kinds: ScheduleKind[],
    notify: NotifyOption,
  ) => Promise<AddScheduleOutcome>
  removeSchedule: (id: string) => void
  hasSchedule: (noticeId: string, kind: ScheduleKind) => boolean

  // 데모 예시 캘린더 (실제 구글 계정 조회 아님)
  demoGoogleConnected: boolean
  connectDemoGoogle: () => void
  refreshDemoGoogle: () => void

  // 초기화
  resetAll: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

function nowISODate(): string {
  return new Date().toISOString()
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState()
    if (!loaded.firstRunDate) {
      loaded.firstRunDate = nowISODate()
    }
    return loaded
  })

  const [auth, setAuth] = useState<AuthSlice>({
    status: 'loading',
    email: null,
    name: null,
    calendarConnected: false,
    googleConfigured: false,
  })

  // 데모 예시 캘린더 표시 여부 (실제 구글 연동과 무관, 화면 데모용)
  const [demoGoogleConnected, setDemoGoogleConnected] = useState(false)

  // localStorage 저장 (사용자 데이터만)
  const firstSave = useRef(true)
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false
    }
    saveState(state)
  }, [state])

  // 최초 로딩 시 서버 인증 상태 복원
  const refreshAuth = useCallback(async () => {
    try {
      const me = await fetchAuthState()
      if (me.authenticated) {
        setAuth({
          status: 'authenticated',
          email: me.user?.email ?? null,
          name: me.user?.name ?? null,
          calendarConnected: Boolean(me.calendarConnected),
          googleConfigured: me.googleConfigured,
        })
      } else {
        setAuth({
          status: 'unauthenticated',
          email: null,
          name: null,
          calendarConnected: false,
          googleConfigured: me.googleConfigured,
        })
      }
    } catch {
      // 서버 응답 실패 시 미인증으로 간주 (localStorage 값으로 로그인 처리하지 않음)
      setAuth((a) => ({ ...a, status: 'unauthenticated' }))
    }
  }, [])

  useEffect(() => {
    void refreshAuth()
  }, [refreshAuth])

  // 로그인 콜백 처리: ?login=success 등 쿼리 정리 후 인증 재조회
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const login = params.get('login')
    if (login) {
      // 쿼리스트링 제거 (히스토리 오염 방지)
      params.delete('login')
      const clean =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : '') +
        window.location.hash
      window.history.replaceState({}, '', clean)
      if (login === 'success') {
        void refreshAuth()
      }
    }
  }, [refreshAuth])

  // 로그인 후 서버가 생성한 일정 목록을 로컬 스케줄에 반영 (내 일정 화면용)
  useEffect(() => {
    if (auth.status !== 'authenticated') return
    let cancelled = false
    void (async () => {
      try {
        const { items } = await fetchCreatedEvents()
        if (cancelled || items.length === 0) return
        setState((s) => {
          const next = [...s.scheduleItems]
          for (const it of items) {
            const id = `${it.noticeId}:${it.kind}`
            const notice = REAL_NOTICES.find((n) => n.id === it.noticeId)
            if (!notice) continue
            const idx = next.findIndex((x) => x.id === id)
            const start = it.kind === 'deadline' ? notice.deadline : notice.eventStart
            if (!start) continue
            const merged: ScheduleItem = {
              id,
              noticeId: it.noticeId,
              title:
                it.kind === 'deadline' ? `[신청 마감] ${notice.title}` : notice.title,
              source: notice.source,
              kind: it.kind,
              start,
              end: it.kind === 'deadline' ? null : notice.eventEnd,
              hasTime:
                it.kind === 'deadline' ? notice.deadlineHasTime : notice.eventHasTime,
              location: it.kind === 'event' ? notice.location : undefined,
              notify: idx >= 0 ? next[idx].notify : 'none',
              origin: 'service',
              createdAt: it.createdAt,
              googleEventId: it.eventId,
              googleHtmlLink: it.htmlLink ?? undefined,
            }
            if (idx >= 0) next[idx] = merged
            else next.push(merged)
          }
          return { ...s, scheduleItems: next }
        })
      } catch {
        // 조회 실패는 조용히 무시 (화면은 로컬 데이터로 동작)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [auth.status])

  const firstRun = state.firstRunDate ?? nowISODate()
  const notices = REAL_NOTICES

  // 데모 예시 일정: 실제 구글 계정 데이터가 아님을 화면에서 명확히 표시한다.
  const googleEvents = useMemo<GoogleEvent[]>(
    () => (demoGoogleConnected ? buildGoogleEvents(firstRun) : []),
    [demoGoogleConnected, firstRun],
  )

  // 실제 Google OAuth 로그인 시작 (서버 엔드포인트로 리다이렉트)
  const loginWithGoogle = useCallback(() => {
    startGoogleLogin()
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      // 프로필/저장/일정 등 사용자 데이터는 로그아웃만으로 삭제하지 않는다.
      setAuth({
        status: 'unauthenticated',
        email: null,
        name: null,
        calendarConnected: false,
        googleConfigured: auth.googleConfigured,
      })
    }
  }, [auth.googleConfigured])

  const completeOnboarding = useCallback((profile: Profile) => {
    setState((s) => ({ ...s, profile, onboarded: true }))
  }, [])

  const updateProfile = useCallback((profile: Profile) => {
    setState((s) => ({ ...s, profile }))
  }, [])

  const toggleSave = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      savedIds: s.savedIds.includes(id)
        ? s.savedIds.filter((x) => x !== id)
        : [...s.savedIds, id],
    }))
  }, [])

  const isSaved = useCallback((id: string) => state.savedIds.includes(id), [state.savedIds])

  const hide = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      hiddenIds: s.hiddenIds.includes(id) ? s.hiddenIds : [...s.hiddenIds, id],
    }))
  }, [])

  const unhide = useCallback((id: string) => {
    setState((s) => ({ ...s, hiddenIds: s.hiddenIds.filter((x) => x !== id) }))
  }, [])

  const resetHidden = useCallback(() => {
    setState((s) => ({ ...s, hiddenIds: [] }))
  }, [])

  /**
   * 실제 Google Calendar 에 이벤트를 생성한다.
   * 성공(생성 또는 기존 확인)한 항목만 로컬 내 일정에 반영한다.
   */
  const addSchedule = useCallback(
    async (
      notice: Notice,
      kinds: ScheduleKind[],
      notify: NotifyOption,
    ): Promise<AddScheduleOutcome> => {
      try {
        const result = await createCalendarEvents({
          noticeId: notice.id,
          kinds,
          notify,
        })
        // 실제 생성/확인된 항목만 로컬에 반영
        setState((s) => {
          const next = [...s.scheduleItems]
          for (const c of result.created) {
            const id = `${notice.id}:${c.kind}`
            const start = c.kind === 'deadline' ? notice.deadline : notice.eventStart
            if (!start) continue
            const item: ScheduleItem = {
              id,
              noticeId: notice.id,
              title:
                c.kind === 'deadline' ? `[신청 마감] ${notice.title}` : notice.title,
              source: notice.source,
              kind: c.kind,
              start,
              end: c.kind === 'deadline' ? null : notice.eventEnd,
              hasTime:
                c.kind === 'deadline' ? notice.deadlineHasTime : notice.eventHasTime,
              location: c.kind === 'event' ? notice.location : undefined,
              notify,
              origin: 'service',
              createdAt: nowISODate(),
              googleEventId: c.eventId,
              googleHtmlLink: c.htmlLink,
            }
            const idx = next.findIndex((x) => x.id === id)
            if (idx >= 0) next[idx] = item
            else next.push(item)
          }
          return { ...s, scheduleItems: next }
        })
        return { ok: result.created.length > 0, result }
      } catch (e) {
        const err = e as Error & { status?: number }
        if (err.status === 401) {
          setAuth((a) => ({ ...a, status: 'unauthenticated' }))
          return { ok: false, error: '로그인이 필요해요. 다시 로그인해 주세요.' }
        }
        return { ok: false, error: err.message ?? '일정 저장에 실패했어요.' }
      }
    },
    [],
  )

  const removeSchedule = useCallback((id: string) => {
    // 앱 내부 기록만 삭제한다. (Google Calendar 실제 이벤트는 삭제하지 않음)
    setState((s) => ({ ...s, scheduleItems: s.scheduleItems.filter((it) => it.id !== id) }))
  }, [])

  const hasSchedule = useCallback(
    (noticeId: string, kind: ScheduleKind) =>
      state.scheduleItems.some((it) => it.id === `${noticeId}:${kind}`),
    [state.scheduleItems],
  )

  const connectDemoGoogle = useCallback(() => {
    setDemoGoogleConnected(true)
  }, [])

  const refreshDemoGoogle = useCallback(() => {
    setDemoGoogleConnected((v) => v) // 재계산 유도용 no-op
  }, [])

  const resetAll = useCallback(() => {
    clearState()
    setState({ ...emptyState, firstRunDate: nowISODate() })
    setDemoGoogleConnected(false)
  }, [])

  const value: StoreValue = {
    state,
    auth,
    notices,
    googleEvents,
    loginWithGoogle,
    logout,
    completeOnboarding,
    updateProfile,
    toggleSave,
    isSaved,
    hide,
    unhide,
    resetHidden,
    addSchedule,
    removeSchedule,
    hasSchedule,
    demoGoogleConnected,
    connectDemoGoogle,
    refreshDemoGoogle,
    resetAll,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
