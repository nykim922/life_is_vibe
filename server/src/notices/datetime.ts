/**
 * KST(Asia/Seoul) 기준 날짜/시간 유틸.
 *
 * 원본 공지 데이터의 날짜는 "2026-09-30T23:59:00+09:00" 처럼
 * 명시적 오프셋(+09:00)을 포함한다. 서버가 어느 타임존에서 돌든
 * 일관되게 해석하기 위해, Date#getHours() (로컬 타임존 의존) 대신
 * ISO 문자열의 오프셋을 반영한 KST 벽시계 시각을 직접 계산한다.
 */

export const KST_OFFSET_MINUTES = 9 * 60 // +09:00
export const TIME_ZONE = 'Asia/Seoul'

export interface KstWallClock {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
}

/**
 * 임의의 시점(Date/ISO)을 KST 벽시계 값으로 변환.
 * 입력 문자열의 오프셋과 무관하게 "한국에서 몇 시인지"를 돌려준다.
 */
export function toKstWallClock(input: string | Date): KstWallClock {
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) {
    throw new Error(`유효하지 않은 날짜: ${String(input)}`)
  }
  // UTC epoch 에 +9h 를 더한 뒤 UTC 필드를 읽으면 KST 벽시계가 된다.
  const shifted = new Date(date.getTime() + KST_OFFSET_MINUTES * 60_000)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  }
}

/** 'YYYY-MM-DD' (KST 날짜) */
export function kstDateString(input: string | Date): string {
  const w = toKstWallClock(input)
  return `${pad4(w.year)}-${pad2(w.month)}-${pad2(w.day)}`
}

/** Google Calendar dateTime 용 오프셋 포함 문자열: 'YYYY-MM-DDTHH:mm:ss+09:00' */
export function kstDateTimeString(input: string | Date): string {
  const w = toKstWallClock(input)
  return `${pad4(w.year)}-${pad2(w.month)}-${pad2(w.day)}T${pad2(w.hour)}:${pad2(
    w.minute,
  )}:${pad2(w.second)}+09:00`
}

/**
 * 원본 ISO 값이 "시간 정보를 가진" 시각인지 판별.
 *
 * 규칙:
 *  - 원본 날짜 문자열이 시간(T...)을 아예 포함하지 않으면 → 시간 없음(날짜만).
 *    예: "2026-09-02"
 *  - 시간을 포함하면, KST 벽시계가 00:00:00 이라도 "실제 자정 시각"으로 본다.
 *    (요구사항: ISO 자정이라는 이유만으로 시간 미정으로 판단하지 않는다.)
 *
 * 즉, 날짜만 있는 원본과 자정에 시작하는 일정을 원본 문자열 형태로 구분한다.
 */
export function rawHasTime(rawValue: string | null | undefined): boolean {
  if (!rawValue) return false
  // 'T' 뒤에 시간 표기가 있으면 시간 정보가 있는 것으로 본다.
  return /\dT\d{2}:\d{2}/.test(rawValue)
}

/**
 * 원본 데이터에서 "날짜만 있는" 경우를 판별하기 위한 보조.
 * "2026-09-02" 처럼 T가 없거나, 명시적으로 자정+오프셋만 있는 경우 등을
 * 데이터 소스 규칙에 맞게 다룬다. 여기서는 원본 문자열에 시간 표기가 있는지로 판단.
 */
export function isDateOnly(rawValue: string | null | undefined): boolean {
  return !rawHasTime(rawValue)
}

/**
 * Google 종일 일정의 종료일은 exclusive(포함하지 않음)다.
 * 시작 KST 날짜(YYYY-MM-DD)와 종료 KST 날짜가 주어지면,
 * 종료일에 +1일 한 날짜 문자열을 반환한다.
 * 종료일이 없으면 시작일 다음 날(하루짜리 종일 일정)을 반환한다.
 */
export function exclusiveEndDate(
  startDateStr: string,
  endDateStr?: string | null,
): string {
  const base = endDateStr ?? startDateStr
  const [y, m, d] = base.split('-').map(Number)
  // UTC 기준으로 날짜 연산 (타임존 영향 배제)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + 1)
  return `${pad4(dt.getUTCFullYear())}-${pad2(dt.getUTCMonth() + 1)}-${pad2(
    dt.getUTCDate(),
  )}`
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
function pad4(n: number): string {
  return String(n).padStart(4, '0')
}
