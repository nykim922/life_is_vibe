// ---- 도메인 타입 정의 ----

export type Category = '교육' | '채용' | '대외활동' | '장학금'

// 관심 분야.
// 기존 기본 카테고리 외에 학과별 추천 키워드와 사용자가 직접 추가한 키워드도
// 담을 수 있도록 string 으로 완화한다. (매칭은 문자열 비교로 동작)
export type Interest = string

export type Goal = '교육 수강' | '직무 탐색' | '인턴 준비' | '대외활동' | '장학금 찾기'

export interface Profile {
  major: string
  grade: number // 1~4
  interests: Interest[]
  goals: Goal[]
  context: string // 자유 입력 맥락
}

/**
 * 공지 시드 데이터.
 * 날짜는 "최초 실행일 기준 + offsetDays" 규칙으로 런타임에 생성한다.
 * 시간(HH:mm)이 null 이면 시간 미정 공지.
 */
export interface NoticeSeed {
  id: string
  title: string
  source: string
  category: Category
  summary: string
  detail: string

  // 자격
  eligibleGrades: number[] // 신청 가능 학년. 비면 전체
  eligibleMajors: string[] // 신청 가능 전공. 비면 전공 무관
  eligibilityNote?: string // 자격 확인 필요 등 부가 안내
  needsEligibilityCheck?: boolean
  undergradIneligible?: boolean // 학부생 지원 불가(대학원 대상 등) → 학부 프로필에서 제외

  interestTags: Interest[]
  relatedGoals: Goal[]

  cost: 'free' | 'paid'
  costNote?: string
  online: boolean
  location?: string // 오프라인일 때 장소

  // 신청 마감 (offsetDays: 최초 실행일로부터 며칠 뒤). null 이면 마감 없음
  deadlineOffsetDays: number | null
  deadlineTime?: string // 'HH:mm', 없으면 시간 미정

  // 행사 일정 (없을 수 있음)
  eventStartOffsetDays: number | null
  eventEndOffsetDays: number | null
  eventStartTime?: string // 'HH:mm'
  eventEndTime?: string
  eventNote?: string // 진행 기간 등 텍스트 표현

  link?: string // 실제 공지 원문/신청 링크 (실데이터에서 제공)
}

/** 날짜가 계산되어 화면에서 바로 쓰는 공지 */
export interface Notice extends NoticeSeed {
  deadline: string | null // ISO
  deadlineHasTime: boolean
  eventStart: string | null // ISO
  eventEnd: string | null // ISO
  eventHasTime: boolean
}

export type ScheduleKind = 'deadline' | 'event'
export type NotifyOption = 'none' | 'hour' | 'day'

/** 서비스에서 추가한 일정 */
export interface ScheduleItem {
  id: string // `${noticeId}:${kind}`
  noticeId: string
  title: string
  source: string
  kind: ScheduleKind
  start: string // ISO
  end: string | null // ISO
  hasTime: boolean
  location?: string
  notify: NotifyOption
  origin: 'service'
  createdAt: string
}

/** 구글 캘린더 데모(읽기 전용) 일정 */
export interface GoogleEvent {
  id: string
  title: string
  start: string // ISO
  end: string // ISO
  hasTime: boolean
  location?: string
  origin: 'google'
}

export interface AppState {
  loggedIn: boolean // 구글 로그인 완료 여부
  userEmail: string | null // 로그인한 구글 계정 (데모에서는 표시용)
  profile: Profile | null
  onboarded: boolean
  savedIds: string[]
  hiddenIds: string[]
  scheduleItems: ScheduleItem[]
  googleConnected: boolean
  firstRunDate: string | null // ISO (날짜만 사용)
}
