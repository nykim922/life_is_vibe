import type { Notice, Profile, Category, Goal } from './types'
import { isPast, dday } from './dates'

export interface ScoredNotice {
  notice: Notice
  score: number
  reasons: string[] // 추천 이유 (프로필-공지 연결)
  matchLevel: 'high' | 'medium' | 'low' // 매칭 강도 (화면 배지/정렬 참고용)
}

// 점수 가중치 (한 곳에 모아 조정하기 쉽게)
const WEIGHT = {
  interest: 12, // 관심사 태그 1개당
  goal: 7, // 목표 1개당
  categoryGoal: 5, // 카테고리↔목표 정합성
  major: 6, // 전공 명시 매칭
  grade: 3, // 학년 명시 매칭
  deadlineUrgent: 6, // 마감 D-3 이내
  deadlineSoon: 3, // 마감 D-7 이내
  online: 1, // 온라인 참여 가능
}

// 카테고리와 자연스럽게 이어지는 목표 (정합성 판단용)
const CATEGORY_GOALS: Record<Category, Goal[]> = {
  교육: ['교육 수강'],
  채용: ['직무 탐색', '인턴 준비'],
  대외활동: ['대외활동'],
  장학금: ['장학금 찾기'],
}

/**
 * 지원 자격 충족 여부.
 * - 명시적으로 자격을 충족하지 못하면 false (추천 제외)
 * - 자격 정보가 부족하면(needsEligibilityCheck) true 로 두되 화면에서 "확인 필요" 표시
 */
export function isEligible(notice: Notice, profile: Profile): boolean {
  // 학부생 지원 불가(대학원 대상 등)
  if (notice.undergradIneligible) return false
  // 학년 조건: eligibleGrades 가 비면 전체 허용
  if (notice.eligibleGrades.length > 0 && !notice.eligibleGrades.includes(profile.grade)) {
    return false
  }
  // 전공 조건: eligibleMajors 가 비면 전공 무관
  if (
    notice.eligibleMajors.length > 0 &&
    !notice.eligibleMajors.includes(profile.major)
  ) {
    return false
  }
  return true
}

/**
 * 프로필-공지 매칭을 한 번에 분석해 점수·이유·강도를 함께 계산한다.
 * 점수와 이유가 같은 근거에서 나오므로 서로 어긋나지 않는다.
 */
export interface MatchAnalysis {
  score: number
  reasons: string[]
  matchLevel: 'high' | 'medium' | 'low'
}

export function analyzeMatch(notice: Notice, profile: Profile): MatchAnalysis {
  let score = 0
  const reasons: string[] = []

  // 1) 관심사 태그 일치 — 가장 강한 신호
  const matchedInterests = notice.interestTags.filter((t) => profile.interests.includes(t))
  if (matchedInterests.length > 0) {
    score += matchedInterests.length * WEIGHT.interest
    reasons.push(
      `관심 분야 ${matchedInterests.map((t) => `'${t}'`).join(', ')}${
        matchedInterests.length > 1 ? ` ${matchedInterests.length}개가` : '와'
      } 직접 맞닿아 있어요.`,
    )
  }

  // 2) 목표 일치
  const matchedGoals = notice.relatedGoals.filter((g) => profile.goals.includes(g))
  if (matchedGoals.length > 0) {
    score += matchedGoals.length * WEIGHT.goal
    reasons.push(`'${matchedGoals[0]}' 목표를 실제로 진전시킬 수 있는 기회예요.`)
  }

  // 3) 카테고리↔목표 정합성 (목표를 직접 고르지 않았어도 카테고리로 연결)
  const catGoals = CATEGORY_GOALS[notice.category] ?? []
  const catGoalHit = catGoals.some((g) => profile.goals.includes(g))
  if (catGoalHit && matchedGoals.length === 0) {
    score += WEIGHT.categoryGoal
    reasons.push(`${notice.category} 공지라 세운 목표 방향과 잘 맞아요.`)
  }

  // 4) 전공 매칭 (명시적으로 대상 전공에 포함될 때만)
  if (notice.eligibleMajors.includes(profile.major)) {
    score += WEIGHT.major
    reasons.push(`${profile.major} 학생을 대상으로 지정한 공지예요.`)
  }

  // 5) 학년 매칭 (명시적 대상 학년일 때)
  if (notice.eligibleGrades.length > 0 && notice.eligibleGrades.includes(profile.grade)) {
    score += WEIGHT.grade
    reasons.push(`${profile.grade}학년이 지원 대상에 포함돼요.`)
  }

  // 6) 마감 임박도 — 놓치면 안 되는 기회를 위로
  const d = dday(notice.deadline)
  if (!d.done && notice.deadline) {
    if (d.soon) {
      score += WEIGHT.deadlineUrgent
      reasons.push(`마감이 ${d.label}로 임박해 지금 확인하는 게 좋아요.`)
    } else {
      // D-7 이내면 약한 가산
      const diff = Math.round(
        (new Date(notice.deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      )
      if (diff <= 7) {
        score += WEIGHT.deadlineSoon
        reasons.push(`마감 ${d.label}, 이번 주 안에 챙기면 좋아요.`)
      }
    }
  }

  // 7) 온라인 접근성 — 소폭 가산
  if (notice.online) {
    score += WEIGHT.online
    reasons.push('온라인으로 참여할 수 있어 부담이 적어요.')
  }

  // 근거가 하나도 없을 때
  if (reasons.length === 0) {
    reasons.push('프로필과 느슨하게 관련 있어 참고할 만한 공지예요.')
  }

  // 매칭 강도: 관심사 직접 일치가 있으면 high, 목표/카테고리라도 걸리면 medium
  let matchLevel: 'high' | 'medium' | 'low' = 'low'
  if (matchedInterests.length > 0) matchLevel = 'high'
  else if (matchedGoals.length > 0 || catGoalHit) matchLevel = 'medium'

  return { score, reasons, matchLevel }
}

/** 프로필-공지 연결 이유 문장 (호환용 래퍼) */
export function buildReasons(notice: Notice, profile: Profile): string[] {
  return analyzeMatch(notice, profile).reasons
}

/** 규칙 기반 점수 (호환용 래퍼) */
export function scoreNotice(notice: Notice, profile: Profile): number {
  return analyzeMatch(notice, profile).score
}

export interface RecommendOptions {
  hiddenIds: string[]
}

/**
 * 홈 기본 추천 목록.
 * - 자격 미충족 제외
 * - 마감된 공지 제외
 * - 숨긴 공지 제외
 * - 점수순 정렬 (동점이면 마감 임박순)
 */
export function recommend(
  notices: Notice[],
  profile: Profile,
  opts: RecommendOptions,
): ScoredNotice[] {
  return notices
    .filter((n) => !opts.hiddenIds.includes(n.id))
    .filter((n) => isEligible(n, profile))
    .filter((n) => !isPast(n.deadline)) // 마감 공지 제외
    .map((n) => {
      const m = analyzeMatch(n, profile)
      return {
        notice: n,
        score: m.score,
        reasons: m.reasons,
        matchLevel: m.matchLevel,
      }
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      // 동점: 마감 임박 우선 (마감 없는 건 뒤로)
      const ad = a.notice.deadline ? new Date(a.notice.deadline).getTime() : Infinity
      const bd = b.notice.deadline ? new Date(b.notice.deadline).getTime() : Infinity
      return ad - bd
    })
}

/**
 * 공지가 "참여 불가능한 요일"에 걸리는지 판정.
 * - 행사/설명회 등 특정 날짜에 진행되는 공지(eventStart)만 대상.
 * - 모집 마감일(deadline)이나 상시/날짜 없는 공지는 요일과 무관하므로 항상 false(차단 안 함).
 * - 프로필에 요일 설정이 없거나 비어 있으면 제한 없음 → 항상 false.
 */
export function isNoticeOnBlockedDay(notice: Notice, profile: Profile): boolean {
  const days = profile.availableDays
  if (!days || days.length === 0) return false // 요일 제한 없음
  if (!notice.eventStart) return false // 행사일이 없는 공지는 요일 필터 제외
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(new Date(notice.eventStart))
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday)
  if (day < 0) return false
  return !days.includes(day) // 참여 가능 요일에 없으면 차단 대상
}
