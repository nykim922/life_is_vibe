// 한국 시간 기준 날짜 유틸. 데모 전체에서 일관되게 사용한다.

const DAY_MS = 24 * 60 * 60 * 1000

/** 오늘(로컬) 자정 Date */
export function todayMidnight(base?: Date): Date {
  const d = base ? new Date(base) : new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** 최초 실행일(자정) 기준 offsetDays + 시간(HH:mm)을 ISO 문자열로 */
export function buildDate(
  firstRunISO: string,
  offsetDays: number,
  time?: string,
): string {
  const base = new Date(firstRunISO)
  base.setHours(0, 0, 0, 0)
  const d = new Date(base.getTime() + offsetDays * DAY_MS)
  if (time) {
    const [h, m] = time.split(':').map(Number)
    d.setHours(h, m, 0, 0)
  }
  return d.toISOString()
}

export function startOfWeek(date: Date): Date {
  // 월요일 시작
  const d = todayMidnight(date)
  const day = d.getDay() // 0 일요일
  const diff = day === 0 ? -6 : 1 - day
  return new Date(d.getTime() + diff * DAY_MS)
}

export function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * DAY_MS)
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isPast(iso: string | null): boolean {
  if (!iso) return false
  return new Date(iso).getTime() < Date.now()
}

/** D-day 계산. 오늘=D-0, 미래=D-n, 과거=마감 */
export function dday(iso: string | null): { label: string; done: boolean; soon: boolean } {
  if (!iso) return { label: '상시', done: false, soon: false }
  const target = todayMidnight(new Date(iso))
  const today = todayMidnight()
  const diff = Math.round((target.getTime() - today.getTime()) / DAY_MS)
  if (diff < 0) return { label: '마감', done: true, soon: false }
  if (diff === 0) return { label: 'D-day', done: false, soon: true }
  return { label: `D-${diff}`, done: false, soon: diff <= 3 }
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}.${d.getDate()}`
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h < 12 ? '오전' : '오후'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${ampm} ${h12}:${String(m).padStart(2, '0')}`
}

export function fmtDateTime(iso: string, hasTime: boolean): string {
  return hasTime ? `${fmtDate(iso)} ${fmtTime(iso)}` : `${fmtDate(iso)} · 시간 미정`
}

export function fmtMonthYear(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
}

export function isWeekend(iso: string): boolean {
  const day = new Date(iso).getDay()
  return day === 0 || day === 6
}

/** 두 시간 구간이 겹치는지 (둘 다 시간 정보가 있어야 판단 가능) */
export function overlaps(
  aStart: string,
  aEnd: string | null,
  bStart: string,
  bEnd: string | null,
): boolean {
  const as = new Date(aStart).getTime()
  const ae = aEnd ? new Date(aEnd).getTime() : as + 60 * 60 * 1000
  const bs = new Date(bStart).getTime()
  const be = bEnd ? new Date(bEnd).getTime() : bs + 60 * 60 * 1000
  return as < be && bs < ae
}
