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
    // 환경변수로 명시한 파일을 가장 우선한다.
    process.env.NOTICES_DATA_FILE ?? '',
    // 기현 브랜치에서 가져온 1,000건 공통 데이터 (개발/빌드 모두 동일 상대 깊이)
    path.resolve(__dirname, '..', '..', '..', 'notices.logic.2.json'),
  ].filter(Boolean)

  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  throw new Error(
    `공지 데이터를 찾을 수 없습니다. NOTICES_DATA_FILE 환경변수로 경로를 지정하세요. 시도: ${candidates.join(
      ' | ',
    )}`,
  )
}

function normalizeValidRaw(raw: string | null | undefined): string | null {
  if (!raw || !Number.isFinite(Date.parse(raw))) return null
  // 생성 데이터의 자정 값은 날짜만 의미하는 경우가 많아 종일 일정으로 통일한다.
  if (/^\d{4}-\d{2}-\d{2}T00:00(?::00)?(?:[+-]\d{2}:\d{2}|Z)?$/.test(raw)) {
    return raw.slice(0, 10)
  }
  return raw
}

function pickDeadlineRaw(raw: RawNotice): string | null {
  const candidates = [raw.applyPeriod?.end, ...(raw.deadlineDates ?? [])]
  for (const candidate of candidates) {
    const valid = normalizeValidRaw(candidate)
    if (valid) return valid
  }
  return null
}

function normalize(raw: RawNotice): ServerNotice | null {
  const title = raw.title?.trim()
  const id = raw.id?.trim()
  if (!title || !id) return null

  const deadlineRaw = pickDeadlineRaw(raw)
  const ev = raw.events?.find((item) => normalizeValidRaw(item?.startAt)) ?? null

  const eventStartRaw = normalizeValidRaw(ev?.startAt)
  const eventEndRaw = normalizeValidRaw(ev?.endAt)

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
