import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import type { GoogleEventBody } from '../calendar/buildEvent'

export interface InsertedEvent {
  id: string
  htmlLink: string
}

/**
 * 사용자의 primary 캘린더에 이벤트를 생성한다.
 *
 * requestId(멱등키)를 함께 넘겨, 네트워크 재시도로 동일 이벤트가
 * 중복 생성되지 않도록 Google 측 중복 방지를 활용한다.
 * (events.insert 자체는 requestId 를 직접 받지 않으므로, import 대신
 *  Google 의 중복 방지를 위해 우리는 서버 저장소 기록으로 1차 차단하고,
 *  Calendar 이벤트에 확장 속성으로 멱등키를 심어 2차 확인한다.)
 */
export async function insertPrimaryEvent(
  client: OAuth2Client,
  body: GoogleEventBody,
  idempotencyKey: string,
): Promise<InsertedEvent> {
  const calendar = google.calendar({ version: 'v3', auth: client })

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      ...body,
      // 확장 속성에 멱등키를 저장해 중복 확인에 사용
      extendedProperties: {
        private: { campusSecretaryKey: idempotencyKey },
      },
    },
  })

  const data = res.data
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
