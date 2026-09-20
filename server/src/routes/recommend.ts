import { Router } from 'express'
import { generateAiRecommendations, isAiConfigured } from '../ai'

export const recommendRouter = Router()

recommendRouter.post('/', async (req, res) => {
  const { profile, notices } = req.body ?? {}

  if (!profile || typeof profile !== 'object' || !Array.isArray(notices)) {
    res.status(400).json({ error: 'profile 과 notices 배열이 필요합니다.' })
    return
  }
  if (notices.length === 0 || notices.length > 100) {
    res.status(400).json({ error: 'notices 배열은 1개 이상 100개 이하여야 합니다.' })
    return
  }

  if (!isAiConfigured()) {
    res.json({ aiUsed: false, recommendations: [] })
    return
  }

  try {
    const recommendations = await generateAiRecommendations(profile, notices)
    res.json({ aiUsed: true, recommendations })
  } catch (error) {
    console.error('[api/recommend] AI 실패, 규칙 기반으로 폴백:', error)
    res.json({ aiUsed: false, recommendations: [] })
  }
})
