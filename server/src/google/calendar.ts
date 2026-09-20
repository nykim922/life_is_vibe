import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import type { GoogleEventBody } from '../calendar/buildEvent'

export interface InsertedEvent {
  id: string
  htmlLink: string
}

// 단일 EC2 프로세스의 동시 삽입을 합치고, 재시도에도 같은 Google 이벤트 ID를 사용한다.
const pending = new Map<string, Promise<InsertedEvent>>()
export function insertPrimaryEvent(
  client: OAuth2Client,
  body: GoogleEventBody,
  idempotencyKey: string,
): Promise<InsertedEvent> {
  const existing = pending.get(idempotencyKey)
  if (existing) return existing
  const task = insertOnce(client, body, idempotencyKey).finally(() => {
    pending.delete(idempotencyKey)
  })
  pending.set(idempotencyKey, task)
  return task
}

async function insertOnce(
  client: OAuth2Client,
  body: GoogleEventBody,
  idempotencyKey: string,
): Promise<InsertedEvent> {
  const calendar = google.calendar({ version: 'v3', auth: client })

  const eventId = `cf${idempotencyKey}`
  let data
  try {
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        ...body,
        id: eventId,
        // 확장 속성에 멱등키를 저장해 중복 확인에 사용
        extendedProperties: {
          private: { campusSecretaryKey: idempotencyKey },
        },
      },
    })

    data = res.data
  } catch (error: any) {
    if (Number(error?.response?.status ?? error?.code) !== 409) throw error
    const res = await calendar.events.get({ calendarId: 'primary', eventId })
    data = res.data
    if (data.status === 'cancelled') throw new Error('Event was deleted')
  }
  if (!data.id) {
    throw new Error('Google Calendar 이벤트 생성 응답에 id 가 없습니다.')
  }
  return {
    id: data.id,
    htmlLink: data.htmlLink ?? '',
  }
}

/**
 * 멱등키(campusSecretaryKey)로 이미 생성된 이벤트가 있는지 조회한다.
 * 서버 저장소 기록이 유실된 경우에도 Google 측에서 중복을 한 번 더 방지한다.
 */
export async function findEventByKey(
  client: OAuth2Client,
  idempotencyKey: string,
): Promise<InsertedEvent | null> {
  const calendar = google.calendar({ version: 'v3', auth: client })
  const res = await calendar.events.list({
    calendarId: 'primary',
    privateExtendedProperty: [`campusSecretaryKey=${idempotencyKey}`],
    maxResults: 1,
    showDeleted: false,
  })
  const item = res.data.items?.[0]
  if (item?.id) {
    return { id: item.id, htmlLink: item.htmlLink ?? '' }
  }
  return null
}
