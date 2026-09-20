import OpenAI from 'openai'
import https from 'node:https'
import { config } from './config'

// OpenAI 호환 AWS Bedrock 게이트웨이를 통한 추천 후처리.
// 실패는 호출부에서 규칙 기반 추천으로 폴백한다.
const insecureAgent = new https.Agent({ rejectUnauthorized: false })

const client = config.ai.apiKey
  ? new OpenAI({
      apiKey: config.ai.apiKey,
      baseURL: config.ai.baseUrl,
      timeout: config.ai.timeoutMs,
      maxRetries: config.ai.maxRetries,
      // 해커톤에서 제공한 IP 기반 자체 서명 게이트웨이 호환용.
      // 신뢰 가능한 인증서가 적용되면 이 옵션을 제거해야 한다.
      httpAgent: insecureAgent,
    } as ConstructorParameters<typeof OpenAI>[0] & { httpAgent: https.Agent })
  : null

export function isAiConfigured(): boolean {
  return client !== null
}

type ProfileInput = {
  major: string
  grade: number
  interests: string[]
  goals: string[]
  context: string
}

type NoticeInput = {
  id: string
  title: string
  category: string
  interestTags: string[]
  relatedGoals: string[]
  deadline: string | null
}

export type AiRecommendation = {
  id: string
  reason: string
  priority: number
}

function buildPrompt(profile: ProfileInput, notices: NoticeInput[]): string {
  return [
    '너는 대학생 맞춤 공지 추천 도우미야.',
    '아래 학생 프로필과 공지 목록을 보고, 각 공지가 이 학생에게 왜 맞는지',
    '자연스러운 한국어 한 문장으로 "추천 이유"를 만들고, 추천 우선순위(1이 가장 추천)를 매겨줘.',
    '',
    '# 학생 프로필',
    `- 전공: ${profile.major || '미설정'}`,
    `- 학년: ${profile.grade || '미설정'}`,
    `- 관심사: ${profile.interests.join(', ') || '없음'}`,
    `- 목표: ${profile.goals.join(', ') || '없음'}`,
    `- 추가 맥락: ${profile.context || '없음'}`,
    '',
    '# 공지 목록 (JSON)',
    JSON.stringify(notices),
    '',
    '# 출력 형식',
    '반드시 아래 JSON 배열 형식으로만 답해. 다른 설명은 절대 넣지 마.',
    '[{"id":"공지id","reason":"추천 이유 한 문장","priority":1}]',
  ].join('\n')
}

function parseAiJson(text: string): AiRecommendation[] {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('AI 응답에서 JSON 배열을 찾지 못했습니다.')
  }

  const parsed = JSON.parse(text.slice(start, end + 1)) as unknown
  if (!Array.isArray(parsed)) throw new Error('AI 응답이 배열이 아닙니다.')

  return parsed
    .filter((value): value is AiRecommendation => {
      const item = value as Record<string, unknown>
      return typeof item.id === 'string' && typeof item.reason === 'string'
    })
    .map((item) => ({
      id: item.id,
      reason: item.reason,
      priority: typeof item.priority === 'number' ? item.priority : 999,
    }))
}

export async function generateAiRecommendations(
  profile: ProfileInput,
  notices: NoticeInput[],
): Promise<AiRecommendation[]> {
  if (!client) throw new Error('AI API 키가 설정되지 않았습니다.')

  const response = await client.chat.completions.create({
    model: config.ai.model,
    messages: [{ role: 'user', content: buildPrompt(profile, notices) }],
  })
  const text = response.choices[0]?.message?.content ?? ''
  if (!text) throw new Error('AI 응답이 비어 있습니다.')
  return parseAiJson(text)
}
