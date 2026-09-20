import OpenAI from 'openai'
import https from 'node:https'

// ===== AI 호출 래퍼 (서버 전용) =====
// OpenAI 호환 게이트웨이(AWS Bedrock)를 통해 추천 이유/우선순위를 생성합니다.
// 실패하면 예외를 던져 호출부가 규칙 기반으로 폴백하게 합니다.

const API_KEY = process.env.API_KEY ?? ''
const BASE_URL = process.env.AI_BASE_URL ?? 'https://52.79.201.46/v1'
const MODEL = process.env.AI_MODEL ?? 'bedrock-haiku'
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 30000)
const MAX_RETRIES = Number(process.env.AI_MAX_RETRIES ?? 2)

// 게이트웨이가 IP + 자체 서명 인증서일 수 있어 검증을 완화한 https 에이전트.
// (사설 게이트웨이 전용. 공개 API 였다면 이렇게 하면 안 됨)
const insecureAgent = new https.Agent({ rejectUnauthorized: false })

const client = API_KEY
  ? new OpenAI({
      apiKey: API_KEY,
      baseURL: BASE_URL,
      timeout: TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
      httpAgent: insecureAgent,
    })
  : null

export function isAiConfigured(): boolean {
  return client !== null
}

// 클라이언트에서 넘어오는 최소 정보
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
    .filter((x): x is AiRecommendation => {
      const o = x as Record<string, unknown>
      return typeof o.id === 'string' && typeof o.reason === 'string'
    })
    .map((x) => ({
      id: x.id,
      reason: x.reason,
      priority: typeof x.priority === 'number' ? x.priority : 999,
    }))
}

// 추천 생성. OpenAI SDK가 재시도/타임아웃을 처리하고, 실패 시 예외를 던짐.
export async function generateAiRecommendations(
  profile: ProfileInput,
  notices: NoticeInput[],
): Promise<AiRecommendation[]> {
  if (!client) throw new Error('AI API 키가 설정되지 않았습니다.')

  const prompt = buildPrompt(profile, notices)
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = res.choices[0]?.message?.content ?? ''
  if (!text) throw new Error('AI 응답이 비어 있습니다.')
  return parseAiJson(text)
}
