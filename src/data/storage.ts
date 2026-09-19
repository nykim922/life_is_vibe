import type { AppState } from './types'

const KEY = 'campus-secretary-v1'

export const emptyState: AppState = {
  profile: null,
  onboarded: false,
  savedIds: [],
  hiddenIds: [],
  scheduleItems: [],
  googleConnected: false,
  firstRunDate: null,
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...emptyState }
    const parsed = JSON.parse(raw) as Partial<AppState>
    return { ...emptyState, ...parsed }
  } catch {
    return { ...emptyState }
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // 저장 실패는 데모에서 조용히 무시
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
