import type { ServerNotice } from '../notices/repository'
import {
  TIME_ZONE,
  exclusiveEndDate,
  kstDateString,
  kstDateTimeString,
  rawHasTime,
} from '../notices/datetime'

export type ScheduleKind = 'deadline' | 'event'
export type NotifyOption = 'none' | 'hour' | 'day'

/** 행사 시작만 있고 종료가 없을 때 사용할 명시적 기본 길이(분). */
export const DEFAULT_EVENT_DURATION_MIN = 60

// Google Calendar events.insert 요청 바디의 최소 형태
export interface GoogleEventBody {
  summary: string
  description?: string
  start: { date?: string; dateTime?: string; timeZone?: string }
  end: { date?: string; dateTime?: string; timeZone?: string }
  reminders?: {
    useDefault: boolean
    overrides?: Array<{ method: 'popup' | 'email'; minutes: number }>
  }
}

export interface BuildResult {
  ok: boolean
  body?: GoogleEventBody
  /** 일정 생성을 건너뛰거나 확인이 필요한 사유 (사용자 안내용) */
  reason?: string
  /** 종료 시각이 없어 기본 길이를 적용한 경우 true (프론트에서 사용자 안내) */
  appliedDefaultDuration?: boolean
}

function reminderOverrides(notify: NotifyOption, hasTime: boolean) {
  // 시간 정보가 없는(종일) 일정에는 '1시간 전'을 적용하지 않는다.
  if (notify === 'none') return { useDefault: false, overrides: [] as [] }
  if (notify === 'hour') {
    if (!hasTime) {
      // 종일 일정: 하루 전으로 대체
      return {
        useDefault: false,
        overrides: [{ method: 'popup' as const, minutes: 24 * 60 }],
      }
    }
    return { useDefault: false, overrides: [{ method: 'popup' as const, minutes: 60 }] }
  }
  // day
  return { useDefault: false, overrides: [{ method: 'popup' as const, minutes: 24 * 60 }] }
}

function buildDescription(notice: ServerNotice, kind: ScheduleKind): string {
  const lines: string[] = []
  lines.push(kind === 'deadline' ? '신청 마감 일정입니다.' : '행사 일정입니다.')
  lines.push(`공지: ${notice.title}`)
  if (notice.category) lines.push(`분류: ${notice.category}`)
  if (notice.link) lines.push(`원문 링크: ${notice.link}`)
  lines.push('\n(캠퍼스 비서에서 추가한 일정)')
  return lines.join('\n')
}

/**
 * 공지 + 일정 유형으로 Google Calendar 이벤트 바디를 만든다.
 * 날짜/시간 규칙(요구사항 6번)을 서버에서 강제한다.
 */
export function buildEventBody(
  notice: ServerNotice,
  kind: ScheduleKind,
  notify: NotifyOption,
): BuildResult {
  if (kind === 'deadline') {
    return buildDeadline(notice, notify)
  }
  return buildEvent(notice, notify)
}

function buildDeadline(notice: ServerNotice, notify: NotifyOption): BuildResult {
  const raw = notice.deadlineRaw
  // 규칙 5: 날짜 정보가 없으면 생성 중단
  if (!raw) {
    return { ok: false, reason: '이 공지에는 신청 마감 날짜 정보가 없어요.' }
  }
  const hasTime = rawHasTime(raw)
  const summary = `[신청 마감] ${notice.title}`
  const description = buildDescription(notice, 'deadline')

  if (!hasTime) {
    // 규칙 2·4: 마감 시간이 없으면 임의 23:59 를 만들지 않고 종일 일정으로 처리
    const startDate = kstDateString(raw)
    return {
      ok: true,
      body: {
        summary,
        description,
        start: { date: startDate },
        end: { date: exclusiveEndDate(startDate) }, // 규칙 9: 종료일 exclusive (+1일)
        reminders: reminderOverrides(notify, false),
      },
    }
  }

  // 시간이 명확한 마감 → 해당 시각의 단일 시점 일정 (기본 길이 적용)
  const startDateTime = kstDateTimeString(raw)
  const end = new Date(new Date(raw).getTime() + DEFAULT_EVENT_DURATION_MIN * 60_000)
  return {
    ok: true,
    body: {
      summary,
      description,
      start: { dateTime: startDateTime, timeZone: TIME_ZONE },
      end: { dateTime: kstDateTimeString(end), timeZone: TIME_ZONE },
      reminders: reminderOverrides(notify, true),
    },
  }
}

function buildEvent(notice: ServerNotice, notify: NotifyOption): BuildResult {
  const startRaw = notice.eventStartRaw
  const endRaw = notice.eventEndRaw
  // 규칙 5: 날짜 정보가 없으면 생성 중단
  if (!startRaw) {
    return { ok: false, reason: '이 공지에는 행사 날짜 정보가 없어요.' }
  }

  const startHasTime = rawHasTime(startRaw)
  const endHasTime = rawHasTime(endRaw)
  const summary = notice.title
  const description = buildDescription(notice, 'event')

  // 규칙 2: 날짜만 있는 경우 → 종일 일정
  if (!startHasTime) {
    const startDate = kstDateString(startRaw)
    // 규칙 10: 연속 여러 날 vs 단일 일정. 종료일이 날짜만 있으면 그 날짜까지 포함.
    const endDate = endRaw ? kstDateString(endRaw) : null
    return {
      ok: true,
      body: {
        summary,
        description,
        start: { date: startDate },
        // 규칙 9: 종일 일정 종료일은 exclusive → 종료 KST 날짜 +1일
        end: { date: exclusiveEndDate(startDate, endDate) },
        reminders: reminderOverrides(notify, false),
      },
    }
  }

  // 시작 시각이 명확한 경우
  const startDateTime = kstDateTimeString(startRaw)

  if (endRaw && endHasTime) {
    // 규칙 1: 시작·종료 시각이 모두 명확 → 그대로 사용
    return {
      ok: true,
      body: {
        summary,
        description,
        start: { dateTime: startDateTime, timeZone: TIME_ZONE },
        end: { dateTime: kstDateTimeString(endRaw), timeZone: TIME_ZONE },
        reminders: reminderOverrides(notify, true),
      },
    }
  }

  // 규칙 3: 시작 시각만 있고 종료가 없거나 종료에 시간이 없음
  // → 임의 종료를 만들지 않고 명시적 기본 길이(60분)를 적용하고 그 사실을 알린다.
  const end = new Date(new Date(startRaw).getTime() + DEFAULT_EVENT_DURATION_MIN * 60_000)
  return {
    ok: true,
    appliedDefaultDuration: true,
    body: {
      summary,
      description,
      start: { dateTime: startDateTime, timeZone: TIME_ZONE },
      end: { dateTime: kstDateTimeString(end), timeZone: TIME_ZONE },
      reminders: reminderOverrides(notify, true),
    },
  }
}
