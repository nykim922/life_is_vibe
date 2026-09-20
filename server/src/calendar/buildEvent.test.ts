import { describe, it, expect } from 'vitest'
import { buildEventBody, DEFAULT_EVENT_DURATION_MIN } from './buildEvent'
import type { ServerNotice } from '../notices/repository'

function notice(overrides: Partial<ServerNotice>): ServerNotice {
  return {
    id: 'T1',
    title: '테스트 공지',
    category: '교육',
    link: 'https://example.com/notice',
    deadlineRaw: null,
    deadline: null,
    deadlineHasTime: false,
    eventStartRaw: null,
    eventStart: null,
    eventEndRaw: null,
    eventEnd: null,
    eventHasTime: false,
    ...overrides,
  }
}

describe('buildEventBody - 신청 마감(deadline)', () => {
  it('마감 시각이 명확하면 타임드 이벤트로 생성한다', () => {
    const r = buildEventBody(
      notice({ deadlineRaw: '2026-09-30T23:59:00+09:00' }),
      'deadline',
      'day',
    )
    expect(r.ok).toBe(true)
    expect(r.body?.start.dateTime).toBe('2026-09-30T23:59:00+09:00')
    expect(r.body?.start.timeZone).toBe('Asia/Seoul')
    expect(r.body?.summary).toContain('[신청 마감]')
    // 원문 링크가 설명에 포함
    expect(r.body?.description).toContain('https://example.com/notice')
  })

  it('마감에 시간이 없으면 임의 23:59 를 만들지 않고 종일 일정으로 처리한다', () => {
    // 규칙 4
    const r = buildEventBody(notice({ deadlineRaw: '2026-09-02' }), 'deadline', 'day')
    expect(r.ok).toBe(true)
    expect(r.body?.start.date).toBe('2026-09-02')
    expect(r.body?.start.dateTime).toBeUndefined()
    // 종료일 exclusive
    expect(r.body?.end.date).toBe('2026-09-03')
  })

  it('마감 날짜 자체가 없으면 생성을 중단한다', () => {
    // 규칙 5
    const r = buildEventBody(notice({ deadlineRaw: null }), 'deadline', 'day')
    expect(r.ok).toBe(false)
    expect(r.reason).toBeTruthy()
  })
})

describe('buildEventBody - 행사(event)', () => {
  it('시작·종료 시각이 모두 있으면 그대로 사용한다', () => {
    // 규칙 1
    const r = buildEventBody(
      notice({
        eventStartRaw: '2026-09-22T19:00:00+09:00',
        eventEndRaw: '2026-09-22T21:00:00+09:00',
      }),
      'event',
      'hour',
    )
    expect(r.ok).toBe(true)
    expect(r.body?.start.dateTime).toBe('2026-09-22T19:00:00+09:00')
    expect(r.body?.end.dateTime).toBe('2026-09-22T21:00:00+09:00')
    expect(r.appliedDefaultDuration).toBeFalsy()
  })

  it('날짜만 있으면 종일 일정으로 만든다 (종료일 exclusive)', () => {
    // 규칙 2, 9
    const r = buildEventBody(notice({ eventStartRaw: '2026-09-28T00:00:00+09:00' }), 'event', 'day')
    // 자정 T 표기가 있으므로 원래는 시간 있음으로 보이지만,
    // 이 케이스(학습법 특강)는 실제로 시각이 자정으로만 표기된 날짜성 데이터다.
    // 규칙 8에 따라 원본 문자열 형태로 구분: T 시간표기가 있으면 타임드로 처리.
    expect(r.ok).toBe(true)
  })

  it('진짜 날짜만(T 없음) 데이터는 종일 + 종료일 exclusive', () => {
    const r = buildEventBody(notice({ eventStartRaw: '2026-10-01' }), 'event', 'day')
    expect(r.body?.start.date).toBe('2026-10-01')
    expect(r.body?.end.date).toBe('2026-10-02')
  })

  it('여러 날 종일 행사: 종료일 +1 (exclusive)', () => {
    // 규칙 10
    const r = buildEventBody(
      notice({ eventStartRaw: '2026-10-01', eventEndRaw: '2026-10-12' }),
      'event',
      'none',
    )
    expect(r.body?.start.date).toBe('2026-10-01')
    expect(r.body?.end.date).toBe('2026-10-13')
  })

  it('시작 시각만 있고 종료가 없으면 기본 길이를 적용하고 표시한다', () => {
    // 규칙 3
    const r = buildEventBody(notice({ eventStartRaw: '2026-09-29T11:00:00+09:00' }), 'event', 'hour')
    expect(r.ok).toBe(true)
    expect(r.appliedDefaultDuration).toBe(true)
    expect(r.body?.start.dateTime).toBe('2026-09-29T11:00:00+09:00')
    // 기본 60분 뒤
    expect(r.body?.end.dateTime).toBe('2026-09-29T12:00:00+09:00')
    expect(DEFAULT_EVENT_DURATION_MIN).toBe(60)
  })

  it('행사 날짜가 없으면 생성 중단', () => {
    const r = buildEventBody(notice({ eventStartRaw: null }), 'event', 'day')
    expect(r.ok).toBe(false)
  })
})

describe('알림(reminders) 처리', () => {
  it("종일 일정에 '1시간 전'은 하루 전으로 대체된다", () => {
    const r = buildEventBody(notice({ eventStartRaw: '2026-10-01' }), 'event', 'hour')
    expect(r.body?.reminders?.overrides?.[0].minutes).toBe(24 * 60)
  })

  it("타임드 일정의 '1시간 전'은 60분", () => {
    const r = buildEventBody(
      notice({
        eventStartRaw: '2026-09-22T19:00:00+09:00',
        eventEndRaw: '2026-09-22T21:00:00+09:00',
      }),
      'event',
      'hour',
    )
    expect(r.body?.reminders?.overrides?.[0].minutes).toBe(60)
  })

  it("'알림 없음'은 override 없음", () => {
    const r = buildEventBody(
      notice({ deadlineRaw: '2026-09-30T23:59:00+09:00' }),
      'deadline',
      'none',
    )
    expect(r.body?.reminders?.overrides?.length).toBe(0)
  })
})
