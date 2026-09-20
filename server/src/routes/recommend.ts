import { Router } from 'express'
import {
  generateAiRecommendations,
  isAiConfigured,
} from '../ai/aiClient'

export const recommendRouter = Router()

/**
 * POST /api/recommend
 * body: { profile, notices[] }
 *
 * 브라우저는 AI 게이트웨이를 직접 부르지 않고 이 엔드포인트를 거친다.
 * - AI 키가 없거나 호출이 실패하면 aiUsed:false 로 응답해
 *   클라이언트가 규칙 기반 추천으로 폴백하게 한다.
 */
recommendRouter.post('/', async (req, res) => {
  const { profile, notices } = req.body ?? {}
  if (!profile || !Array.isArray(notices)) {
    return res
      .status(400)
      .json({ error: 'profile 과 notices 배열이 필요합니다.' })
  }

  // 키가 없으면 클라이언트가 규칙 기반으로 폴백하도록 알림
  if (!isAiConfigured()) {
    return res.status(200).json({ aiUsed: false, recommendations: [] })
  }

  try {
    const recommendations = await generateAiRecommendations(profile, notices)
    return res.json({ aiUsed: true, recommendations })
  } catch (err) {
    console.error('[api/recommend] AI 실패, 폴백 예정:', err)
    return res.status(200).json({ aiUsed: false, recommendations: [] })
  }
})
