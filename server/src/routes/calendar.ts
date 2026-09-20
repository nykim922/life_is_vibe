import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import { getNoticeById } from '../notices/repository'
import { buildEventBody, type ScheduleKind, type NotifyOption } from '../calendar/buildEvent'
import { clientFromTokens } from '../google/oauthClient'
import { insertPrimaryEvent, findEventByKey, listPrimaryEvents } from '../google/calendar'
import {
  getUser,
  upsertUserTokens,
  findCreatedEvent,
  recordCreatedEvent,
  listCreatedEvents,
  makeIdempotencyKey,
} from '../store/tokenStore'

export const calendarRouter = Router()

const VALID_KINDS: ScheduleKind[] = ['deadline', 'event']
const VALID_NOTIFY: NotifyOption[] = ['none', 'hour', 'day']

interface CreatedItemResponse {
  kind: ScheduleKind
  eventId: string
  htmlLink: string
  duplicate: boolean
  appliedDefaultDuration?: boolean
}

/**
 * POST /api/calendar/events
 * body: { noticeId, kinds: ('deadline'|'event')[], notify: 'none'|'hour'|'day' }
 * ('둘 다' 선택 시 kinds 에 두 값이 온다)
 *
 * 서버가 공지 데이터를 조회·검증한 뒤 이벤트를 생성한다.
 * 클라이언트가 보낸 제목/날짜는 신뢰하지 않는다.
 */
calendarRouter.post('/events', requireAuth, async (req, res) => {
  const sub = req.session.userSub!
  const { noticeId, kinds, notify } = req.body ?? {}

  // ---- 입력 검증 ----
  if (typeof noticeId !== 'string' || !noticeId) {
    res.status(400).json({ error: 'invalid_notice', message: 'noticeId 가 필요합니다.' })
    return
  }
  const requestedKinds: ScheduleKind[] = Array.isArray(kinds)
    ? kinds.filter((k: unknown): k is ScheduleKind =>
        VALID_KINDS.includes(k as ScheduleKind),
      )
    : []
  if (requestedKinds.length === 0) {
    res
      .status(400)
      .json({ error: 'invalid_kind', message: 'deadline/event 중 하나 이상이 필요합니다.' })
    return
  }
  const notifyOption: NotifyOption = VALID_NOTIFY.includes(notify)
    ? notify
    : 'none'

  // ---- 서버에서 공지 조회·검증 ----
  const notice = getNoticeById(noticeId)
  if (!notice) {
    res.status(404).json({ error: 'notice_not_found', message: '공지를 찾을 수 없습니다.' })
    return
  }

  const user = getUser(sub)
  if (!user) {
    res.status(401).json({ error: 'unauthenticated' })
    return
  }

  const client = clientFromTokens(user.tokens)
  // 토큰이 갱신되면 다시 저장 (refresh token 흐름)
  client.on('tokens', (newTokens) => {
    upsertUserTokens({
      sub: user.sub,
      email: user.email,
      name: user.name,
      tokens: { ...user.tokens, ...newTokens },
    })
  })

  const created: CreatedItemResponse[] = []
  const skipped: Array<{ kind: ScheduleKind; reason: string }> = []

  for (const kind of dedupe(requestedKinds)) {
    const build = buildEventBody(notice, kind, notifyOption)
    if (!build.ok || !build.body) {
      // 날짜 정보 없음 등 → 해당 유형만 건너뛰고 사유 반환 (규칙 5)
      skipped.push({ kind, reason: build.reason ?? '일정을 생성할 수 없습니다.' })
      continue
    }

    const key = makeIdempotencyKey(sub, noticeId, kind)

    // 1차 중복 방지: 서버 저장 기록
    const existing = findCreatedEvent(key)
    if (existing) {
      created.push({
        kind,
        eventId: existing.eventId,
        htmlLink: existing.htmlLink ?? '',
        duplicate: true,
      })
      continue
    }

    try {
      // 2차 중복 방지: Google 측 확장 속성으로 조회 (기록 유실 대비)
      const already = await findEventByKey(client, key)
      if (already) {
        recordCreatedEvent({
          idempotencyKey: key,
          userSub: sub,
          noticeId,
          kind,
          eventId: already.id,
          htmlLink: already.htmlLink,
        })
        created.push({ kind, eventId: already.id, htmlLink: already.htmlLink, duplicate: true })
        continue
      }

      const inserted = await insertPrimaryEvent(client, build.body, key)
      recordCreatedEvent({
        idempotencyKey: key,
        userSub: sub,
        noticeId,
        kind,
        eventId: inserted.id,
        htmlLink: inserted.htmlLink,
      })
      created.push({
        kind,
        eventId: inserted.id,
        htmlLink: inserted.htmlLink,
        duplicate: false,
        appliedDefaultDuration: build.appliedDefaultDuration,
      })
    } catch (e: any) {
      console.error('[calendar] 이벤트 생성 실패', kind)
      // 실제 저장 실패는 성공으로 처리하지 않는다.
      skipped.push({
        kind,
        reason: 'Google Calendar 저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
      })
    }
  }

  // 하나도 생성/기존확인되지 않았다면 실패로 응답
  if (created.length === 0) {
    res.status(422).json({
      error: 'no_events_created',
      message: '생성된 일정이 없습니다.',
      skipped,
    })
    return
  }

  res.json({
    ok: true,
    noticeId,
    noticeTitle: notice.title,
    created,
    skipped,
  })
})

/** 내가 생성한 캘린더 일정 목록 (내 일정 화면 반영용) */
calendarRouter.get('/events', requireAuth, (req, res) => {
  const sub = req.session.userSub!
  const items = listCreatedEvents(sub).map((r) => ({
    noticeId: r.noticeId,
    kind: r.kind,
    eventId: r.eventId,
    htmlLink: r.htmlLink,
    createdAt: r.createdAt,
  }))
  res.json({ ok: true, items })
})

/** 연결된 사용자의 primary Google Calendar 일정 조회 */
calendarRouter.get('/google-events', requireAuth, async (req, res) => {
  const sub = req.session.userSub!
  const timeMin = parseDateQuery(req.query.timeMin)
  const timeMax = parseDateQuery(req.query.timeMax)
  if (!timeMin || !timeMax || timeMax.getTime() <= timeMin.getTime()) {
    res.status(400).json({
      error: 'invalid_range',
      message: '올바른 조회 시작일과 종료일이 필요합니다.',
    })
    return
  }

  const rangeMs = timeMax.getTime() - timeMin.getTime()
  if (rangeMs > 62 * 24 * 60 * 60 * 1000) {
    res.status(400).json({
      error: 'range_too_large',
      message: '한 번에 최대 62일까지 조회할 수 있습니다.',
    })
    return
  }

  const user = getUser(sub)
  if (!user) {
    res.status(401).json({ error: 'unauthenticated' })
    return
  }

  const client = clientFromTokens(user.tokens)
  client.on('tokens', (newTokens) => {
    upsertUserTokens({
      sub: user.sub,
      email: user.email,
      name: user.name,
      tokens: { ...user.tokens, ...newTokens },
    })
  })

  try {
    const items = await listPrimaryEvents(client, timeMin.toISOString(), timeMax.toISOString())
    res.json({ ok: true, items })
  } catch (error: any) {
    const status = Number(error?.response?.status ?? error?.code)
    console.error('[calendar] 일정 조회 실패', Number.isFinite(status) ? status : 'unknown')
    if (status === 401 || status === 403) {
      res.status(401).json({
        error: 'calendar_authorization_expired',
        message: 'Google Calendar 권한을 다시 연결해 주세요.',
      })
      return
    }
    res.status(502).json({
      error: 'calendar_unavailable',
      message: 'Google Calendar 일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
    })
  }
})

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

function parseDateQuery(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
