import { afterEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import type { Server } from 'http'
import type { AddressInfo } from 'net'

vi.mock('../store/tokenStore', () => ({
  getUser: (sub: string) => sub === 'valid-user' ? { sub, tokens: {} } : null,
}))
vi.mock('../ai/aiClient', () => ({
  isAiConfigured: () => true,
  generateAiRecommendations: vi.fn(async () => [{ noticeId: 'test', score: 90 }]),
}))

import { recommendRouter } from './recommend'
import { generateAiRecommendations } from '../ai/aiClient'

let server: Server | undefined
afterEach(async () => {
  vi.clearAllMocks()
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()))
})

async function request(userSub?: string) {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    req.session = { userSub, destroy: (done: () => void) => done() } as any
    next()
  })
  app.use('/api/recommend', recommendRouter)
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  return fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/recommend`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: {}, notices: [{ id: 'test' }] }),
  })
}

describe('recommendation session boundary', () => {
  it('rejects anonymous requests before calling AI', async () => {
    expect((await request()).status).toBe(401)
    expect(generateAiRecommendations).not.toHaveBeenCalled()
  })
  it('rejects sessions without a stored user', async () => {
    expect((await request('missing-user')).status).toBe(401)
    expect(generateAiRecommendations).not.toHaveBeenCalled()
  })
  it('preserves recommendations for authenticated users', async () => {
    const res = await request('valid-user')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ aiUsed: true, recommendations: [{ noticeId: 'test', score: 90 }] })
  })
})
