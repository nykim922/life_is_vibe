import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OAuth2Client } from 'google-auth-library'
import type { GoogleEventBody } from '../calendar/buildEvent'

const mocks = vi.hoisted(() => ({ insert: vi.fn(), get: vi.fn(), list: vi.fn() }))
vi.mock('googleapis', () => ({ google: { calendar: () => ({ events: mocks }) } }))
import { insertPrimaryEvent, listPrimaryEvents } from './calendar'

describe('Google event idempotency', () => {
  const client = {} as OAuth2Client
  const body = {} as GoogleEventBody
  beforeEach(() => vi.resetAllMocks())

  it('coalesces concurrent requests and uses a stable event ID', async () => {
    mocks.insert.mockResolvedValue({ data: { id: 'cfabc123', htmlLink: 'https://calendar.google.com/' } })
    const results = await Promise.all([
      insertPrimaryEvent(client, body, 'abc123'),
      insertPrimaryEvent(client, body, 'abc123'),
    ])
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(mocks.insert.mock.calls[0][0].requestBody.id).toBe('cfabc123')
    expect(results[0]).toEqual(results[1])
  })

  it('recovers an existing event after an insert conflict', async () => {
    mocks.insert.mockRejectedValue({ response: { status: 409 } })
    mocks.get.mockResolvedValue({ data: { id: 'cfabc123' } })
    expect((await insertPrimaryEvent(client, body, 'abc123')).id).toBe('cfabc123')
  })

  it('does not report success after a Google failure and allows retry', async () => {
    mocks.insert.mockRejectedValueOnce(new Error('unavailable'))
    await expect(insertPrimaryEvent(client, body, 'abc123')).rejects.toThrow('unavailable')
    mocks.insert.mockResolvedValueOnce({ data: { id: 'cfabc123' } })
    expect((await insertPrimaryEvent(client, body, 'abc123')).id).toBe('cfabc123')
  })

  it('lists and normalizes paginated primary calendar events', async () => {
    mocks.list
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'timed',
              summary: '  팀 회의  ',
              start: { dateTime: '2026-09-21T10:00:00+09:00' },
              end: { dateTime: '2026-09-21T11:00:00+09:00' },
              htmlLink: 'https://calendar.google.com/timed',
            },
          ],
          nextPageToken: 'page-2',
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'all-day',
              start: { date: '2026-09-22' },
              end: { date: '2026-09-23' },
            },
            { id: 'cancelled', status: 'cancelled' },
          ],
        },
      })

    const events = await listPrimaryEvents(
      client,
      '2026-09-20T00:00:00.000Z',
      '2026-09-27T00:00:00.000Z',
    )
    expect(mocks.list).toHaveBeenCalledTimes(2)
    expect(mocks.list.mock.calls[1][0].pageToken).toBe('page-2')
    expect(events).toEqual([
      {
        id: 'timed',
        title: '팀 회의',
        start: '2026-09-21T10:00:00+09:00',
        end: '2026-09-21T11:00:00+09:00',
        hasTime: true,
        location: undefined,
        htmlLink: 'https://calendar.google.com/timed',
      },
      {
        id: 'all-day',
        title: '(제목 없음)',
        start: '2026-09-22',
        end: '2026-09-23',
        hasTime: false,
        location: undefined,
        htmlLink: '',
      },
    ])
  })
})
