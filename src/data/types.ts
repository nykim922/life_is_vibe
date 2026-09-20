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
  // 참여 가능한 요일 (0=일 ~ 6=토). 비었거나 없으면 요일 제한 없음.
  availableDays?: number[]
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

/** 서비스에서 추가한 일정 (실제 Google Calendar 에 생성됨) */
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
  // 실제 Google Calendar 연동 결과
  googleEventId?: string
  googleHtmlLink?: string
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

/**
 * localStorage 에 저장되는 앱 데이터.
 * 주의: 로그인/캘린더 권한 여부는 여기(localStorage)로 판단하지 않는다.
 * 실제 인증 상태는 서버(/api/auth/me)에서만 검증한다. (AuthSlice 참고)
 * profile/saved/hidden/schedule 등 사용자 데이터만 로컬에 보존한다.
 */
export interface AppState {
  profile: Profile | null
  onboarded: boolean
  savedIds: string[]
  hiddenIds: string[]
  scheduleItems: ScheduleItem[]
  firstRunDate: string | null // ISO (날짜만 사용). 데모 예시 계산에만 쓰임.
}

/** 서버에서 검증한 인증 상태 (localStorage 아님) */
export interface AuthSlice {
  status: 'loading' | 'authenticated' | 'unauthenticated'
  email: string | null
  name: string | null
  // 실제 Google Calendar 이벤트 생성 권한(calendar.events scope) 보유 여부
  calendarConnected: boolean
  // 서버에 Google OAuth 자격증명이 구성되어 실제 로그인이 가능한지
  googleConfigured: boolean
}
