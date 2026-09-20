import type { AppState } from './types'

const KEY = 'campus-secretary-v1'

// localStorage 에는 사용자 데이터(프로필/저장/숨김/일정)만 저장한다.
// 로그인·캘린더 권한 여부는 서버에서만 검증한다.
export const emptyState: AppState = {
  profile: null,
  onboarded: false,
  savedIds: [],
  hiddenIds: [],
  scheduleItems: [],
  firstRunDate: null,
}

// 과거 데모 버전에 남아 있던 인증 관련 필드는 무시하고 사용자 데이터만 취한다.
type LegacyState = Partial<AppState> & {
  loggedIn?: boolean
  userEmail?: string | null
  googleConnected?: boolean
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...emptyState }
    const parsed = JSON.parse(raw) as LegacyState
    // 인증 필드(loggedIn/userEmail/googleConnected)는 의도적으로 버린다.
    return {
      profile: parsed.profile ?? null,
      onboarded: parsed.onboarded ?? false,
      savedIds: parsed.savedIds ?? [],
      hiddenIds: parsed.hiddenIds ?? [],
      scheduleItems: parsed.scheduleItems ?? [],
      firstRunDate: parsed.firstRunDate ?? null,
    }
  } catch {
    return { ...emptyState }
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // 저장 실패는 조용히 무시
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
