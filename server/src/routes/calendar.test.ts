import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ServerNotice } from '../notices/repository'

/**
 * calendar 라우트의 핵심 로직(공지 검증 → 이벤트 바디 생성 → 중복 방지 → 삽입)을
 * Google API 와 저장소를 Mocking 하여 검증한다.
 * 실제 Google Cloud 자격증명 없이 동작을 확인하기 위한 테스트다.
 */

// --- Mock 대상 모듈들 ---
const insertMock = vi.fn()
const findByKeyMock = vi.fn()

vi.mock('../google/calendar', () => ({
  insertPrimaryEvent: (...args: unknown[]) => insertMock(...args),
  findEventByKey: (...args: unknown[]) => findByKeyMock(...args),
}))

vi.mock('../google/oauthClient', () => ({
  clientFromTokens: () => ({ on: vi.fn() }),
}))

// 인메모리 저장소로 tokenStore 대체
const created = new Map<string, any>()
const users = new Map<string, any>()
vi.mock('../store/tokenStore', () => ({
  getUser: (sub: string) => users.get(sub) ?? null,
  upsertUserTokens: (u: any) => users.set(u.sub, u),
  findCreatedEvent: (k: string) => created.get(k) ?? null,
  recordCreatedEvent: (r: any) => created.set(r.idempotencyKey, r),
  listCreatedEvents: (sub: string) =>
    Array.from(created.values()).filter((e) => e.userSub === sub),
  makeIdempotencyKey: (sub: string, noticeId: string, kind: string) =>
    `${sub}:${noticeId}:${kind}`,
}))

// 공지 저장소 mock
const noticeMap = new Map<string, ServerNotice>()
vi.mock('../notices/repository', () => ({
  getNoticeById: (id: string) => noticeMap.get(id),
}))

// requireAuth 를 통과시키되 세션 사용자 주입
vi.mock('../middleware/requireAuth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.session = { userSub: 'user-1' }
    next()
  },
}))

// 라우트가 mock 을 사용하도록 import 는 mock 정의 이후에 수행
import express from 'express'
import { calendarRouter } from './calendar'

function makeApp() {
  const app = express()
  app.use(express.json())
  // 세션 주입 (requireAuth mock 이 덮어씀)
  app.use((req: any, _res, next) => {
    req.session = { userSub: 'user-1' }
    next()
  })
  app.use('/api/calendar', calendarRouter)
  return app
}

// 간단한 supertest 대체: express app 을 직접 호출
import http from 'http'

function callApi(
  app: express.Express,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app)
    server.listen(0, () => {
      const { port } = server.address() as import('net').AddressInfo
      const data = body ? JSON.stringify(body) : undefined
      const req = http.request(
        { host: '127.0.0.1', port, path, method, headers: { 'Content-Type': 'application/json' } },
        (res) => {
          let raw = ''
          res.on('data', (c) => (raw += c))
          res.on('end', () => {
            server.close()
            resolve({ status: res.statusCode ?? 0, json: raw ? JSON.parse(raw) : {} })
          })
        },
      )
      req.on('error', (e) => {
        server.close()
        reject(e)
      })
      if (data) req.write(data)
      req.end()
    })
  })
}

const NOTICE: ServerNotice = {
  id: 'KMU-006',
  title: 'CJ 신입 채용',
  category: '채용·인턴',
  link: 'https://example.com/cj',
  deadlineRaw: '2026-09-30T17:00:00+09:00',
  deadline: '2026-09-30T08:00:00.000Z',
  deadlineHasTime: true,
  eventStartRaw: '2026-09-22T19:00:00+09:00',
  eventStart: '2026-09-22T10:00:00.000Z',
  eventEndRaw: '2026-09-22T21:00:00+09:00',
  eventEnd: '2026-09-22T12:00:00.000Z',
  eventHasTime: true,
}

describe('POST /api/calendar/events (mocked Google)', () => {
  beforeEach(() => {
    insertMock.mockReset()
    findByKeyMock.mockReset()
    created.clear()
    users.clear()
    noticeMap.clear()
    users.set('user-1', { sub: 'user-1', email: 'a@b.com', tokens: {} })
    noticeMap.set(NOTICE.id, NOTICE)
    findByKeyMock.mockResolvedValue(null)
    let n = 0
    insertMock.mockImplementation(async () => {
      n += 1
      return { id: `evt-${n}`, htmlLink: `https://cal/evt-${n}` }
    })
  })

  it("'둘 다' 선택 시 두 개의 이벤트를 생성한다", async () => {
    const app = makeApp()
    const res = await callApi(app, 'POST', '/api/calendar/events', {
      noticeId: 'KMU-006',
      kinds: ['deadline', 'event'],
      notify: 'day',
    })
    expect(res.status).toBe(200)
    expect(res.json.ok).toBe(true)
    expect(res.json.created).toHaveLength(2)
    expect(insertMock).toHaveBeenCalledTimes(2)
    expect(res.json.created[0].htmlLink).toContain('https://cal/')
  })

  it('동일 요청 재시도 시 중복 생성하지 않는다', async () => {
    const app = makeApp()
    await callApi(app, 'POST', '/api/calendar/events', {
      noticeId: 'KMU-006',
      kinds: ['deadline'],
      notify: 'none',
    })
    // 두 번째 호출: 서버 기록으로 중복 차단
    const res2 = await callApi(app, 'POST', '/api/calendar/events', {
      noticeId: 'KMU-006',
      kinds: ['deadline'],
      notify: 'none',
    })
    expect(res2.json.created[0].duplicate).toBe(true)
    // insert 는 최초 1회만
    expect(insertMock).toHaveBeenCalledTimes(1)
  })

  it('존재하지 않는 공지는 404', async () => {
    const app = makeApp()
    const res = await callApi(app, 'POST', '/api/calendar/events', {
      noticeId: 'NOPE',
      kinds: ['deadline'],
      notify: 'none',
    })
    expect(res.status).toBe(404)
  })

  it('kinds 가 비면 400', async () => {
    const app = makeApp()
    const res = await callApi(app, 'POST', '/api/calendar/events', {
      noticeId: 'KMU-006',
      kinds: [],
      notify: 'none',
    })
    expect(res.status).toBe(400)
  })

  it('Google 삽입 실패 시 성공으로 표시하지 않는다', async () => {
    insertMock.mockRejectedValueOnce(new Error('boom'))
    const app = makeApp()
    const res = await callApi(app, 'POST', '/api/calendar/events', {
      noticeId: 'KMU-006',
      kinds: ['deadline'],
      notify: 'none',
    })
    expect(res.status).toBe(422)
    expect(res.json.error).toBe('no_events_created')
  })
})
