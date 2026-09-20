import type { Profile } from './types'
import type { ScoredNotice } from './recommend'

// ===== AI 추천 클라이언트 (브라우저 → 우리 서버 → AI 게이트웨이) =====
// 규칙 기반 ScoredNotice 목록을 받아 서버 /api/recommend 로 보내고,
// AI 추천 이유/우선순위를 받아옵니다.
// 실패하거나 AI 미사용이면 입력 목록을 그대로 폴백으로 반환합니다.

type ApiResponse = {
  aiUsed: boolean
  recommendations: Array<{ id: string; reason: string; priority: number }>
}

export type AiRecommendResult = {
  items: ScoredNotice[]
  aiUsed: boolean
}

const REQUEST_TIMEOUT_MS = 40000

export async function recommendWithAi(
  scored: ScoredNotice[],
  profile: Profile,
): Promise<AiRecommendResult> {
  if (scored.length === 0) {
    return { items: scored, aiUsed: false }
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        profile: {
          major: profile.major,
          grade: profile.grade,
          interests: profile.interests,
          goals: profile.goals,
          context: profile.context,
        },
        notices: scored.map(({ notice }) => ({
          id: notice.id,
          title: notice.title,
          category: notice.category,
          interestTags: notice.interestTags,
          relatedGoals: notice.relatedGoals,
          deadline: notice.deadline,
        })),
      }),
    })
    clearTimeout(timer)

    if (!res.ok) throw new Error(`서버 응답 오류: ${res.status}`)
    const data = (await res.json()) as ApiResponse

    if (!data.aiUsed || data.recommendations.length === 0) {
      return { items: scored, aiUsed: false }
    }

    const aiMap = new Map(data.recommendations.map((r) => [r.id, r]))
    const merged: ScoredNotice[] = scored
      .map((item) => {
        const ai = aiMap.get(item.notice.id)
        return {
          notice: item.notice,
          score: ai ? 1000 - ai.priority : item.score,
          reasons: ai ? [ai.reason] : item.reasons,
        }
      })
      .sort((a, b) => b.score - a.score)

    return { items: merged, aiUsed: true }
  } catch {
    return { items: scored, aiUsed: false }
  }
}
