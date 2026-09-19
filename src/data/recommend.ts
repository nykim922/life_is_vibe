import type { Notice, Profile } from './types'
import { isPast } from './dates'

export interface ScoredNotice {
  notice: Notice
  score: number
  reasons: string[] // 추천 이유 (프로필-공지 연결)
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

/** 프로필-공지 연결 이유 문장 생성 */
export function buildReasons(notice: Notice, profile: Profile): string[] {
  const reasons: string[] = []

  const matchedInterests = notice.interestTags.filter((t) => profile.interests.includes(t))
  if (matchedInterests.length > 0) {
    reasons.push(`관심 분야인 ${matchedInterests.join(', ')} 와 연결돼요.`)
  }

  const matchedGoals = notice.relatedGoals.filter((g) => profile.goals.includes(g))
  if (matchedGoals.length > 0) {
    reasons.push(`'${matchedGoals[0]}' 목표와 이어지는 기회예요.`)
  }

  if (notice.eligibleMajors.includes(profile.major)) {
    reasons.push(`${profile.major} 학생이 신청할 수 있어요.`)
  }

  if (notice.eligibleGrades.includes(profile.grade)) {
    reasons.push(`${profile.grade}학년도 지원 대상이에요.`)
  }

  if (notice.online) {
    reasons.push('온라인으로 참여할 수 있어요.')
  }

  if (reasons.length === 0) {
    reasons.push('프로필과 관련 있어 참고할 만한 공지예요.')
  }

  return reasons
}

/**
 * 간단한 규칙 기반 점수.
 * 관심 태그 일치(가중치 큼) + 목표 일치 + 전공/학년 일치 + 온라인 소폭 가산.
 * 근거 없는 퍼센트는 노출하지 않고, 정렬용 내부 점수로만 사용.
 */
export function scoreNotice(notice: Notice, profile: Profile): number {
  let score = 0
  score += notice.interestTags.filter((t) => profile.interests.includes(t)).length * 10
  score += notice.relatedGoals.filter((g) => profile.goals.includes(g)).length * 6
  if (notice.eligibleMajors.includes(profile.major)) score += 4
  if (notice.eligibleGrades.includes(profile.grade)) score += 2
  return score
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
    .map((n) => ({
      notice: n,
      score: scoreNotice(n, profile),
      reasons: buildReasons(n, profile),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      // 동점: 마감 임박 우선 (마감 없는 건 뒤로)
      const ad = a.notice.deadline ? new Date(a.notice.deadline).getTime() : Infinity
      const bd = b.notice.deadline ? new Date(b.notice.deadline).getTime() : Infinity
      return ad - bd
    })
}
