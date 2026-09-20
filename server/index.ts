import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { generateAiRecommendations, isAiConfigured } from './ai'

// ===== API 프록시 서버 =====
// 브라우저는 이 서버의 /api/* 만 호출하고, AI API 키는 서버에만 존재합니다.
// (키가 브라우저로 절대 노출되지 않음)

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, aiConfigured: isAiConfigured() })
})

app.post('/api/recommend', async (req, res) => {
  const { profile, notices } = req.body ?? {}

  if (!profile || !Array.isArray(notices)) {
    return res.status(400).json({ error: 'profile 과 notices 배열이 필요합니다.' })
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

const PORT = Number(process.env.PORT ?? 8787)
app.listen(PORT, () => {
  console.log(
    `[server] http://localhost:${PORT} (AI ${
      isAiConfigured() ? '사용 가능' : '미설정 → 규칙 기반 폴백'
    })`,
  )
})
