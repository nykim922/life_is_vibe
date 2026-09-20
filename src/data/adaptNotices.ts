import type { Notice, Category, Interest, Goal } from './types'
import rawData from './notices.data.json'

// ===== 팀 실데이터(notices.logic.json) → 앱 Notice 형식 변환 =====
// 팀이 제공한 국민대 공지 JSON을 화면에서 바로 쓰는 Notice 로 바꿉니다.
// 실제 마감일(ISO)을 그대로 쓰므로 offsetDays 방식을 거치지 않습니다.

// 팀 JSON 한 항목의 느슨한 타입 (필요한 필드만)
type RawEvent = {
  label?: string
  startAt?: string | null
  endAt?: string | null
}

type RawNotice = {
  id?: string
  title?: string
  category?: string
  interestTags?: string[]
  gradeCodes?: number[] | null
  degreeLevels?: string[] | null
  majorOpen?: boolean
  majorList?: string[]
  majorStatus?: string
  events?: RawEvent[]
  applyPeriod?: { start?: string | null; end?: string | null }
  deadlineDates?: string[]
  reviewRequired?: boolean
  link?: string
  summary?: string
}

// 팀 카테고리(6종) → 앱 카테고리(4종)
function mapCategory(raw: string | undefined): Category {
  switch (raw) {
    case '장학금':
      return '장학금'
    case '채용·인턴':
      return '채용'
    case '공모전·대회':
    case '연구·프로젝트':
      return '대외활동'
    case '교육·특강':
    case '학사·행정':
    default:
      return '교육'
  }
}

// 팀 관심 태그 → 앱 Interest 로 매핑.
// 학과별 추천 키워드(options.ts 의 INTEREST_BY_MAJOR)와 이름을 맞춰,
// 프로필 관심 키워드와 공지 태그가 직접 매칭되도록 한다.
const INTEREST_MAP: Record<string, Interest[]> = {
  '반도체': ['반도체'],
  '공정·장비': ['공정·장비'],
  '생산·품질': ['생산·품질'],
  '소프트웨어': ['소프트웨어'],
  '임베디드·펌웨어': ['임베디드·펌웨어'],
  '통신·네트워크': ['통신·네트워크'],
  'AI·데이터': ['AI·데이터'],
  '연구개발': ['연구개발'],
  '신소재': ['신소재'],
  '보안': ['보안'],
  '창업': ['창업'],
  '콘텐츠': ['콘텐츠'],
  '디자인·콘텐츠': ['디자인', '콘텐츠'],
  '영업·마케팅': ['마케팅'],
  '경영·기획': ['경영·기획'],
  '금융·회계': ['금융·회계'],
  '기계·모빌리티': ['기계·모빌리티'],
  '공공·행정': ['경영·기획'],
  '통신': ['통신·네트워크'],
}

function mapInterests(tags: string[] | undefined): Interest[] {
  if (!Array.isArray(tags)) return []
  const mapped = tags.flatMap((tag) => INTEREST_MAP[tag] ?? [])
  // 한 원천 태그가 여러 관심 키워드로 확장될 수 있으므로 마지막에 중복 제거
  return Array.from(new Set(mapped))
}

// 카테고리로 관련 목표를 추론 (팀 데이터엔 목표 필드가 없음)
function inferGoals(category: Category, tags: string[] | undefined): Goal[] {
  const goals = new Set<Goal>()
  if (category === '장학금') goals.add('장학금 찾기')
  if (category === '채용') {
    goals.add('직무 탐색')
    goals.add('인턴 준비')
  }
  if (category === '대외활동') goals.add('대외활동')
  if (category === '교육') goals.add('교육 수강')
  // 취업준비 태그가 있으면 직무 탐색 추가
  if (Array.isArray(tags) && tags.includes('취업준비')) goals.add('직무 탐색')
  return Array.from(goals)
}

// 학부생이 지원 불가한지 (석/박사 전용) 판단
function isUndergradIneligible(levels: string[] | null | undefined): boolean {
  if (!Array.isArray(levels) || levels.length === 0) return false
  const undergradKeys = ['undergraduate', 'bachelor']
  const hasUndergrad = levels.some((l) => undergradKeys.includes(l))
  return !hasUndergrad // 학부 레벨이 하나도 없으면 학부생 지원 불가
}

// 대상 전공 목록 결정
function mapMajors(raw: RawNotice): string[] {
  // 전공 무관이거나(open) 상태가 명확히 제한이 아니면 빈 배열(전공 무관)
  if (raw.majorOpen) return []
  if (raw.majorStatus === 'restricted' && Array.isArray(raw.majorList)) {
    return raw.majorList
  }
  // conditional/unknown/by_role 등은 전공 무관으로 취급(과도한 필터링 방지)
  return []
}

// 마감일 결정: applyPeriod.end 우선, 없으면 deadlineDates[0]
function pickDeadline(raw: RawNotice): string | null {
  const end = raw.applyPeriod?.end
  if (end) return new Date(end).toISOString()
  const dd = raw.deadlineDates?.[0]
  if (dd) return new Date(dd).toISOString()
  return null
}

// 첫 번째 행사 일정 추출
function pickEvent(raw: RawNotice): {
  start: string | null
  end: string | null
  hasTime: boolean
  note?: string
} {
  const ev = raw.events?.[0]
  if (!ev || !ev.startAt) {
    return { start: null, end: null, hasTime: false }
  }
  const start = new Date(ev.startAt).toISOString()
  const end = ev.endAt ? new Date(ev.endAt).toISOString() : null
  // startAt 에 시각 정보가 있는지 (자정 00:00 이면 시간 미정으로 간주)
  const d = new Date(ev.startAt)
  const hasTime = !(d.getHours() === 0 && d.getMinutes() === 0)
  const note = raw.events && raw.events.length > 1 ? `외 ${raw.events.length - 1}개 일정` : undefined
  return { start, end, hasTime, note }
}

// 온라인 여부 추론 (제목/행사 라벨에 '온라인/LIVE/Zoom' 있으면 온라인)
function inferOnline(raw: RawNotice): boolean {
  const text = `${raw.title ?? ''} ${(raw.events ?? []).map((e) => e.label ?? '').join(' ')}`
  return /온라인|online|live|zoom|비대면/i.test(text)
}

function adaptOne(raw: RawNotice): Notice | null {
  const title = raw.title?.trim()
  if (!title) return null

  const category = mapCategory(raw.category)
  const deadline = pickDeadline(raw)
  const ev = pickEvent(raw)
  const grades = Array.isArray(raw.gradeCodes) ? raw.gradeCodes : [] // null → 무관

  return {
    id: raw.id ?? title.slice(0, 12),
    title,
    source: '국민대학교 전자공학부',
    category,
    summary: raw.summary ?? '',
    detail: raw.summary ?? '',
    eligibleGrades: grades,
    eligibleMajors: mapMajors(raw),
    eligibilityNote: raw.reviewRequired ? '세부 자격은 공지 원문 확인 필요' : undefined,
    needsEligibilityCheck: raw.reviewRequired ?? false,
    undergradIneligible: isUndergradIneligible(raw.degreeLevels),
    interestTags: mapInterests(raw.interestTags),
    relatedGoals: inferGoals(category, raw.interestTags),
    cost: 'free',
    online: inferOnline(raw),
    location: undefined,
    link: raw.link,

    // offsetDays 기반 필드는 실데이터에선 안 쓰므로 기본값
    deadlineOffsetDays: null,
    eventStartOffsetDays: null,
    eventEndOffsetDays: null,
    eventNote: ev.note,

    // 실제 계산된 날짜 (Notice 확장 필드)
    deadline,
    deadlineHasTime: deadline ? hasTimeInISO(deadline) : false,
    eventStart: ev.start,
    eventEnd: ev.end,
    eventHasTime: ev.hasTime,
  }
}

// ISO 문자열에 시각 정보가 있는지 (자정이 아니면 시간 있음)
function hasTimeInISO(iso: string): boolean {
  const d = new Date(iso)
  return !(d.getHours() === 0 && d.getMinutes() === 0)
}

// 실데이터 전체를 Notice[] 로 변환 (마감 지난 것도 포함 - 화면 로직이 필터링)
export const REAL_NOTICES: Notice[] = (rawData as RawNotice[])
  .map(adaptOne)
  .filter((n): n is Notice => n !== null)
