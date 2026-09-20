import { describe, it, expect } from 'vitest'
import {
  toKstWallClock,
  kstDateString,
  kstDateTimeString,
  rawHasTime,
  isDateOnly,
  exclusiveEndDate,
} from './datetime'

describe('KST 날짜/시간 유틸', () => {
  it('오프셋 포함 ISO 를 KST 벽시계로 정확히 변환한다', () => {
    const w = toKstWallClock('2026-09-30T23:59:00+09:00')
    expect(w).toMatchObject({
      year: 2026,
      month: 9,
      day: 30,
      hour: 23,
      minute: 59,
    })
  })

  it('UTC 로 표기된 시각도 KST 로 변환한다 (타임존 무관)', () => {
    // 2026-09-30T14:59:00Z == 2026-09-30T23:59:00+09:00
    const w = toKstWallClock('2026-09-30T14:59:00Z')
    expect(w.hour).toBe(23)
    expect(w.minute).toBe(59)
    expect(w.day).toBe(30)
  })

  it('kstDateString 은 KST 기준 날짜를 준다', () => {
    // UTC 자정 직후는 KST 로는 같은 날 오전 9시
    expect(kstDateString('2026-10-05T00:00:00+09:00')).toBe('2026-10-05')
    expect(kstDateString('2026-10-04T15:30:00Z')).toBe('2026-10-05')
  })

  it('kstDateTimeString 은 +09:00 오프셋을 붙인다', () => {
    expect(kstDateTimeString('2026-09-22T19:00:00+09:00')).toBe(
      '2026-09-22T19:00:00+09:00',
    )
  })

  it('rawHasTime: 날짜만 있는 문자열은 시간 없음', () => {
    expect(rawHasTime('2026-09-02')).toBe(false)
    expect(isDateOnly('2026-09-02')).toBe(true)
  })

  it('rawHasTime: 자정이라도 T 시간표기가 있으면 시간 있음으로 본다', () => {
    // 요구사항 7: ISO 자정이라는 이유만으로 시간 미정으로 판단하지 않는다.
    expect(rawHasTime('2026-09-28T00:00:00+09:00')).toBe(true)
  })

  it('rawHasTime: 실제 시각이 있으면 시간 있음', () => {
    expect(rawHasTime('2026-09-30T23:59:00+09:00')).toBe(true)
  })

  it('exclusiveEndDate: 하루짜리 종일 일정은 시작일 +1', () => {
    expect(exclusiveEndDate('2026-10-05')).toBe('2026-10-06')
  })

  it('exclusiveEndDate: 여러 날 행사는 종료일 +1 (exclusive)', () => {
    // 10/1 ~ 10/12 종일 → 종료는 10/13 (exclusive)
    expect(exclusiveEndDate('2026-10-01', '2026-10-12')).toBe('2026-10-13')
  })

  it('exclusiveEndDate: 월말 넘어가는 계산도 정확', () => {
    expect(exclusiveEndDate('2026-10-31')).toBe('2026-11-01')
  })
})
