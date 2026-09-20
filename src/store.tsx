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

interface StoreValue {
  state: AppState
  notices: Notice[]
  googleEvents: GoogleEvent[] // 데모 연결 시에만 채워짐

  // 로그인 (구글)
  loginWithGoogle: (email?: string) => void
  logout: () => void

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

  // 일정
  addSchedule: (
    notice: Notice,
    kind: ScheduleKind,
    notify: NotifyOption,
  ) => void
  removeSchedule: (id: string) => void
  hasSchedule: (noticeId: string, kind: ScheduleKind) => boolean

  // 구글 캘린더 데모
  connectGoogle: () => void
  refreshGoogle: () => void

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
    // 최초 실행일이 없으면 지금으로 고정
    if (!loaded.firstRunDate) {
      loaded.firstRunDate = nowISODate()
    }
    return loaded
  })

  // 상태 변경 시 localStorage 저장
  const firstSave = useRef(true)
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false
    }
    saveState(state)
  }, [state])

  const firstRun = state.firstRunDate ?? nowISODate()

  // 팀 실데이터(국민대 공지)를 사용. firstRun 은 구글 데모 일정 계산에만 쓰임.
  const notices = REAL_NOTICES

  const googleEvents = useMemo<GoogleEvent[]>(
    () => (state.googleConnected ? buildGoogleEvents(firstRun) : []),
    [state.googleConnected, firstRun],
  )

  // 구글 로그인. 로그인과 동시에 구글 캘린더도 연동된 것으로 처리.
  const loginWithGoogle = useCallback((email?: string) => {
    setState((s) => ({
      ...s,
      loggedIn: true,
      userEmail: email ?? s.userEmail ?? 'student@kookmin.ac.kr',
      googleConnected: true, // 로그인하면 캘린더 자동 연동
    }))
  }, [])

  const logout = useCallback(() => {
    setState((s) => ({ ...s, loggedIn: false, userEmail: null, googleConnected: false }))
  }, [])

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

  const addSchedule = useCallback(
    (notice: Notice, kind: ScheduleKind, notify: NotifyOption) => {
      const id = `${notice.id}:${kind}`
      setState((s) => {
        if (s.scheduleItems.some((it) => it.id === id)) return s // 중복 방지
        const start = kind === 'deadline' ? notice.deadline : notice.eventStart
        if (!start) return s
        const hasTime = kind === 'deadline' ? notice.deadlineHasTime : notice.eventHasTime
        const end = kind === 'deadline' ? null : notice.eventEnd
        const item: ScheduleItem = {
          id,
          noticeId: notice.id,
          title: kind === 'deadline' ? `[신청 마감] ${notice.title}` : notice.title,
          source: notice.source,
          kind,
          start,
          end,
          hasTime,
          location: kind === 'event' ? notice.location : undefined,
          notify,
          origin: 'service',
          createdAt: nowISODate(),
        }
        return { ...s, scheduleItems: [...s.scheduleItems, item] }
      })
    },
    [],
  )

  const removeSchedule = useCallback((id: string) => {
    setState((s) => ({ ...s, scheduleItems: s.scheduleItems.filter((it) => it.id !== id) }))
  }, [])

  const hasSchedule = useCallback(
    (noticeId: string, kind: ScheduleKind) =>
      state.scheduleItems.some((it) => it.id === `${noticeId}:${kind}`),
    [state.scheduleItems],
  )

  const connectGoogle = useCallback(() => {
    setState((s) => ({ ...s, googleConnected: true }))
  }, [])

  const refreshGoogle = useCallback(() => {
    // 데모: 예시 데이터를 다시 불러오는 동작. 상태 토글로 재계산 유도.
    setState((s) => ({ ...s }))
  }, [])

  const resetAll = useCallback(() => {
    clearState()
    setState({ ...emptyState, firstRunDate: nowISODate() })
  }, [])

  const value: StoreValue = {
    state,
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
    connectGoogle,
    refreshGoogle,
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
