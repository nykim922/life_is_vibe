import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { config } from '../config'
import type { Credentials } from 'google-auth-library'

/**
 * OAuth 토큰 및 생성 이력을 서버 측 JSON 파일에 저장한다(순수 JS, 네이티브 모듈 없음).
 *
 * - Node.js 프로세스가 재시작돼도 인증정보가 유실되지 않는다(파일 기반).
 * - 토큰은 저장 시 AES-256-GCM 으로 암호화한다(TOKEN_ENC_KEY).
 * - 브라우저/클라이언트에는 토큰을 절대 내려주지 않는다.
 *
 * 해커톤 MVP 단일 EC2 환경에 적합하며, 별도 RDS/DynamoDB 가 필요 없다.
 * (동시 쓰기 규모가 큰 서비스로 확장 시에는 DB 로 교체 가능하도록 API 를 좁게 유지)
 */

const DB_DIR = config.sessionDbDir
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })

const USERS_FILE = path.join(DB_DIR, 'users.json')
const EVENTS_FILE = path.join(DB_DIR, 'created-events.json')

// ---- 저장소 스키마 (디스크) ----
interface UserRow {
  sub: string
  email: string
  name?: string
  tokensEnc: string
  updatedAt: string
}
interface EventRow {
  idempotencyKey: string
  userSub: string
  noticeId: string
  kind: string
  eventId: string
  htmlLink: string | null
  createdAt: string
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T
  } catch {
    return fallback
  }
}

function writeJsonAtomic(file: string, data: unknown): void {
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, file) // 원자적 교체로 부분 쓰기 방지
}

// ---- 토큰 암호화 (AES-256-GCM) ----
function encKey(): Buffer {
  const raw = process.env.TOKEN_ENC_KEY ?? config.sessionSecret
  return crypto.createHash('sha256').update(raw).digest() // 32바이트
}

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':')
}

function decrypt(payload: string): string {
  const [ivB64, tagB64, encB64] = payload.split(':')
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encKey(),
    Buffer.from(ivB64, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const dec = Buffer.concat([
    decipher.update(Buffer.from(encB64, 'base64')),
    decipher.final(),
  ])
  return dec.toString('utf8')
}

export interface StoredUser {
  sub: string
  email: string
  name?: string
  tokens: Credentials
}

function loadUsers(): Record<string, UserRow> {
  return readJson<Record<string, UserRow>>(USERS_FILE, {})
}
function loadEvents(): Record<string, EventRow> {
  return readJson<Record<string, EventRow>>(EVENTS_FILE, {})
}

export function upsertUserTokens(user: {
  sub: string
  email: string
  name?: string
  tokens: Credentials
}): void {
  const users = loadUsers()
  const existing = users[user.sub]
  const merged: Credentials = { ...user.tokens }
  // 기존 refresh_token 유지 (구글은 재동의 없이는 재발급하지 않음)
  if (!merged.refresh_token && existing) {
    try {
      const prev = JSON.parse(decrypt(existing.tokensEnc)) as Credentials
      if (prev.refresh_token) merged.refresh_token = prev.refresh_token
    } catch {
      /* ignore */
    }
  }
  users[user.sub] = {
    sub: user.sub,
    email: user.email,
    name: user.name,
    tokensEnc: encrypt(JSON.stringify(merged)),
    updatedAt: new Date().toISOString(),
  }
  writeJsonAtomic(USERS_FILE, users)
}

export function getUser(sub: string): StoredUser | null {
  const row = loadUsers()[sub]
  if (!row) return null
  return {
    sub: row.sub,
    email: row.email,
    name: row.name,
    tokens: JSON.parse(decrypt(row.tokensEnc)) as Credentials,
  }
}

export function deleteUser(sub: string): void {
  const users = loadUsers()
  if (users[sub]) {
    delete users[sub]
    writeJsonAtomic(USERS_FILE, users)
  }
}

// ---- 생성 이벤트(중복 방지) ----
export interface CreatedEventRecord {
  idempotencyKey: string
  userSub: string
  noticeId: string
  kind: string
  eventId: string
  htmlLink: string | null
  createdAt: string
}

export function findCreatedEvent(key: string): CreatedEventRecord | null {
  const row = loadEvents()[key]
  return row ?? null
}

export function recordCreatedEvent(rec: {
  idempotencyKey: string
  userSub: string
  noticeId: string
  kind: string
  eventId: string
  htmlLink: string | null
}): void {
  const events = loadEvents()
  events[rec.idempotencyKey] = { ...rec, createdAt: new Date().toISOString() }
  writeJsonAtomic(EVENTS_FILE, events)
}

/** 사용자가 생성한 이벤트 목록 (내 일정 화면 반영용) */
export function listCreatedEvents(userSub: string): CreatedEventRecord[] {
  return Object.values(loadEvents())
    .filter((e) => e.userSub === userSub)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** 멱등키 생성: 같은 사용자·공지·일정유형은 항상 동일 키 */
export function makeIdempotencyKey(
  userSub: string,
  noticeId: string,
  kind: string,
): string {
  return crypto
    .createHash('sha256')
    .update(`${userSub}:${noticeId}:${kind}`)
    .digest('hex')
    .slice(0, 32)
}
