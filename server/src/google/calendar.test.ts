import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OAuth2Client } from 'google-auth-library'
import type { GoogleEventBody } from '../calendar/buildEvent'

const mocks = vi.hoisted(() => ({ insert: vi.fn(), get: vi.fn() }))
vi.mock('googleapis', () => ({ google: { calendar: () => ({ events: mocks }) } }))
import { insertPrimaryEvent } from './calendar'

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
})
