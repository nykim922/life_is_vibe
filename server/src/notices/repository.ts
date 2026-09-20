import fs from 'fs'
import path from 'path'
import { rawHasTime } from './datetime'

/**
 * 공지 데이터는 프론트엔드와 동일한 소스(src/data/notices.data.json)를 그대로 읽는다.
 * 데이터 이중화를 피해 프론트/백엔드 공지가 항상 일치하도록 한다.
 */

// 원본 이벤트(팀 데이터)
interface RawEvent {
  label?: string
  startAt?: string | null
  endAt?: string | null
  durationMin?: number | null
  type?: string
}

interface RawNotice {
  id?: string
  title?: string
  category?: string
  events?: RawEvent[]
  applyPeriod?: { start?: string | null; end?: string | null }
  deadlineDates?: string[]
  link?: string
  summary?: string
}

/** 서버에서 검증에 사용하는 정규화된 공지 */
export interface ServerNotice {
  id: string
  title: string
  category: string
  link?: string

  // 신청 마감
  deadlineRaw: string | null // 원본 문자열 (시간 유무 판별용)
  deadline: string | null // ISO
  deadlineHasTime: boolean

  // 첫 번째 행사 일정
  eventStartRaw: string | null
  eventStart: string | null // ISO
  eventEndRaw: string | null
  eventEnd: string | null // ISO
  eventHasTime: boolean
  eventLabel?: string
}

// 프론트엔드 데이터 파일 경로 후보 (개발/빌드 환경 모두 대응)
function resolveDataFile(): string {
  const candidates = [
    // 개발: server/src -> ../../src/data
    path.resolve(__dirname, '..', '..', '..', 'src', 'data', 'notices.data.json'),
    // 빌드: server/dist/notices -> ../../../src/data
    path.resolve(__dirname, '..', '..', '..', '..', 'src', 'data', 'notices.data.json'),
    // 환경변수로 명시
    process.env.NOTICES_DATA_FILE ?? '',
  ].filter(Boolean)

  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  throw new Error(
    `notices.data.json 을 찾을 수 없습니다. NOTICES_DATA_FILE 환경변수로 경로를 지정하세요. 시도: ${candidates.join(
      ' | ',
    )}`,
  )
}

function pickDeadlineRaw(raw: RawNotice): string | null {
  const end = raw.applyPeriod?.end
  if (end) return end
  const dd = raw.deadlineDates?.[0]
  if (dd) return dd
  return null
}

function normalize(raw: RawNotice): ServerNotice | null {
  const title = raw.title?.trim()
  const id = raw.id?.trim()
  if (!title || !id) return null

  const deadlineRaw = pickDeadlineRaw(raw)
  const ev = raw.events?.find((e) => e && e.startAt) ?? null

  const eventStartRaw = ev?.startAt ?? null
  const eventEndRaw = ev?.endAt ?? null

  return {
    id,
    title,
    category: raw.category ?? '',
    link: raw.link,

    deadlineRaw,
    deadline: deadlineRaw ? new Date(deadlineRaw).toISOString() : null,
    deadlineHasTime: rawHasTime(deadlineRaw),

    eventStartRaw,
    eventStart: eventStartRaw ? new Date(eventStartRaw).toISOString() : null,
    eventEndRaw,
    eventEnd: eventEndRaw ? new Date(eventEndRaw).toISOString() : null,
    eventHasTime: rawHasTime(eventStartRaw),
    eventLabel: ev?.label,
  }
}

let cache: Map<string, ServerNotice> | null = null

export function loadNotices(): Map<string, ServerNotice> {
  if (cache) return cache
  const file = resolveDataFile()
  const rawList = JSON.parse(fs.readFileSync(file, 'utf-8')) as RawNotice[]
  const map = new Map<string, ServerNotice>()
  for (const raw of rawList) {
    const n = normalize(raw)
    if (n) map.set(n.id, n)
  }
  cache = map
  return map
}

/** 테스트/데이터 갱신용 캐시 초기화 */
export function resetNoticeCache(): void {
  cache = null
}

export function getNoticeById(id: string): ServerNotice | undefined {
  return loadNotices().get(id)
}
