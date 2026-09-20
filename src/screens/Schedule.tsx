import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import {
  addDays,
  fmtMonthYear,
  fmtTime,
  sameDay,
  startOfWeek,
  todayMidnight,
} from '../data/dates'
import { fetchGoogleCalendarEvents, type CalendarEventItem } from '../data/api'
import type { ScheduleItem } from '../data/types'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  TrashIcon,
} from '../components/icons'
import './Schedule.css'

const WD = ['일', '월', '화', '수', '목', '금', '토']

type LoadState = 'loading' | 'ready' | 'error'
type Row =
  | { type: 'service'; item: ScheduleItem; time: number }
  | {
      type: 'google'
      item: CalendarEventItem
      serviceItem?: ScheduleItem
      time: number
    }

function occursOnDay(event: CalendarEventItem, day: Date): boolean {
  const dayStart = todayMidnight(day).getTime()
  const dayEnd = addDays(todayMidnight(day), 1).getTime()
  const eventStart = new Date(event.start).getTime()
  const eventEnd = new Date(event.end).getTime()
  if (!Number.isFinite(eventStart) || !Number.isFinite(eventEnd)) return false
  return eventStart < dayEnd && eventEnd > dayStart
}

export function Schedule() {
  const { state, auth, removeSchedule } = useStore()
  const { show: showToast } = useToast()

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [selected, setSelected] = useState(() => todayMidnight())
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [reloadKey, setReloadKey] = useState(0)

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  useEffect(() => {
    if (auth.status !== 'authenticated' || !auth.calendarConnected) {
      setCalendarEvents([])
      setLoadState('error')
      return
    }

    let cancelled = false
    setLoadState('loading')
    setCalendarEvents([])
    void fetchGoogleCalendarEvents({
      timeMin: weekStart.toISOString(),
      timeMax: addDays(weekStart, 7).toISOString(),
    })
      .then(({ items }) => {
        if (cancelled) return
        setCalendarEvents(items)
        setLoadState('ready')
      })
      .catch((error: Error) => {
        if (cancelled) return
        setCalendarEvents([])
        setLoadState('error')
        showToast(error.message || '구글 캘린더 일정을 불러오지 못했어요')
      })

    return () => {
      cancelled = true
    }
  }, [auth.status, auth.calendarConnected, weekStart, reloadKey, showToast])

  const serviceByGoogleId = useMemo(() => {
    const map = new Map<string, ScheduleItem>()
    for (const item of state.scheduleItems) {
      if (item.googleEventId) map.set(item.googleEventId, item)
    }
    return map
  }, [state.scheduleItems])

  const daysWithEvents = useMemo(() => {
    const set = new Set<string>()
    for (const day of weekDays) {
      if (calendarEvents.some((event) => occursOnDay(event, day))) {
        set.add(day.toDateString())
      }
    }
    for (const item of state.scheduleItems) {
      if (!item.googleEventId) {
        set.add(todayMidnight(new Date(item.start)).toDateString())
      }
    }
    return set
  }, [calendarEvents, state.scheduleItems, weekDays])

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = calendarEvents
      .filter((event) => occursOnDay(event, selected))
      .map((event) => ({
        type: 'google' as const,
        item: event,
        serviceItem: serviceByGoogleId.get(event.id),
        time: event.hasTime ? new Date(event.start).getTime() : 0,
      }))

    state.scheduleItems
      .filter((item) => !item.googleEventId && sameDay(new Date(item.start), selected))
      .forEach((item) => {
        list.push({ type: 'service', item, time: new Date(item.start).getTime() })
      })

    return list.sort((a, b) => a.time - b.time)
  }, [calendarEvents, selected, serviceByGoogleId, state.scheduleItems])

  const goToday = () => {
    const today = todayMidnight()
    setWeekStart(startOfWeek(today))
    setSelected(today)
  }

  return (
    <div className="page sched">
      <div className="sched__head">
        <div>
          <h1 className="page__title">내 일정</h1>
          <p className="home__summary">{fmtMonthYear(selected)}</p>
        </div>
        <button className="home__edit" onClick={goToday}>
          오늘
        </button>
      </div>

      <div className="sched__weeknav">
        <button
          className="sched__navbtn"
          onClick={() => setWeekStart((week) => addDays(week, -7))}
          aria-label="이전 주"
        >
          <ChevronLeftIcon size={20} />
        </button>
        <span className="sched__weeklabel">
          {weekDays[0].getMonth() + 1}.{weekDays[0].getDate()} – {weekDays[6].getMonth() + 1}.
          {weekDays[6].getDate()}
        </span>
        <button
          className="sched__navbtn"
          onClick={() => setWeekStart((week) => addDays(week, 7))}
          aria-label="다음 주"
        >
          <ChevronRightIcon size={20} />
        </button>
      </div>

      <div className="sched__days">
        {weekDays.map((day) => {
          const isSelected = sameDay(day, selected)
          const isToday = sameDay(day, todayMidnight())
          const hasEvent = daysWithEvents.has(day.toDateString())
          return (
            <button
              key={day.toISOString()}
              className={`sched__day${isSelected ? ' is-sel' : ''}`}
              onClick={() => setSelected(todayMidnight(day))}
              aria-label={`${day.getMonth() + 1}월 ${day.getDate()}일 ${WD[day.getDay()]}요일`}
              aria-pressed={isSelected}
            >
              <span className="sched__dow">{WD[day.getDay()]}</span>
              <span className={`sched__date${isToday && !isSelected ? ' is-today' : ''}`}>
                {day.getDate()}
              </span>
              <span className={`sched__dot${hasEvent ? ' is-on' : ''}`} aria-hidden="true" />
            </button>
          )
        })}
      </div>

      <div className="sched__status">
        <span className={`badge ${loadState === 'ready' ? 'badge--green' : ''}`}>
          {loadState === 'loading'
            ? '동기화 중'
            : loadState === 'ready'
              ? 'Google Calendar 연결됨'
              : '동기화 필요'}
        </span>
        <span className="sched__status-note">
          {loadState === 'loading'
            ? '이번 주 일정을 불러오고 있어요'
            : loadState === 'ready'
              ? `이번 주 일정 ${calendarEvents.length}개를 불러왔어요`
              : '일정을 불러오지 못했어요. 다시 시도해 주세요.'}
        </span>
        <button className="sched__refresh" onClick={() => setReloadKey((key) => key + 1)}>
          새로고침
        </button>
      </div>

      <div className="sched__list">
        {loadState === 'loading' && rows.length === 0 ? (
          <div className="empty">
            <p className="empty__title">일정을 불러오는 중이에요</p>
            <p className="empty__desc">Google Calendar와 동기화하고 있어요.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty">
            <p className="empty__title">이 날짜에 일정이 없어요</p>
            <p className="empty__desc">추천 공지 상세에서 일정을 추가할 수 있어요.</p>
          </div>
        ) : (
          rows.map((row) => {
            if (row.type === 'google') {
              const event = row.item
              const serviceItem = row.serviceItem
              return (
                <div key={`google:${event.id}`} className="sched__item sched__item--google">
                  <div className="sched__time">
                    {event.hasTime ? (
                      <>
                        <span>{fmtTime(event.start)}</span>
                        <span className="sched__time-end">{fmtTime(event.end)}</span>
                      </>
                    ) : (
                      <span>종일</span>
                    )}
                  </div>
                  <div className="sched__body">
                    <div className="sched__badges">
                      <span className="badge badge--green">Google Calendar</span>
                      {serviceItem && (
                        <span
                          className={`badge ${
                            serviceItem.kind === 'deadline' ? 'badge--soon' : 'badge--purple'
                          }`}
                        >
                          {serviceItem.kind === 'deadline' ? '신청 마감' : '행사 참석'}
                        </span>
                      )}
                    </div>
                    <p className="sched__title">{event.title}</p>
                    {event.location && (
                      <p className="sched__loc">
                        <MapPinIcon size={14} /> {event.location}
                      </p>
                    )}
                    {event.htmlLink && (
                      <a
                        className="sched__gcal-link"
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Google Calendar에서 열기
                      </a>
                    )}
                  </div>
                </div>
              )
            }

            const item = row.item
            const isDeadline = item.kind === 'deadline'
            return (
              <div
                key={item.id}
                className={`sched__item${isDeadline ? ' sched__item--deadline' : ' sched__item--event'}`}
              >
                <div className="sched__time">
                  {item.hasTime ? (
                    <>
                      <span>{fmtTime(item.start)}</span>
                      {item.end && <span className="sched__time-end">{fmtTime(item.end)}</span>}
                    </>
                  ) : (
                    <span>{isDeadline ? '마감일' : '시간 미정'}</span>
                  )}
                </div>
                <div className="sched__body">
                  <div className="sched__badges">
                    <span className={`badge ${isDeadline ? 'badge--soon' : 'badge--purple'}`}>
                      {isDeadline ? '신청 마감' : '행사 참석'}
                    </span>
                    <span className="badge">서비스에서 추가</span>
                    {item.notify !== 'none' && (
                      <span className="badge">
                        알림 {item.notify === 'hour' ? '1시간 전' : '하루 전'}
                      </span>
                    )}
                  </div>
                  <p className="sched__title">{item.title}</p>
                  {item.location && (
                    <p className="sched__loc">
                      <MapPinIcon size={14} /> {item.location}
                    </p>
                  )}
                  {!item.hasTime && (
                    <p className="sched__loc">
                      <ClockIcon size={14} /> 시간 미정 · 날짜 기준
                    </p>
                  )}
                </div>
                <button
                  className="sched__del"
                  onClick={() => {
                    removeSchedule(item.id)
                    showToast('일정을 삭제했어요')
                  }}
                  aria-label="앱 목록에서 제거"
                >
                  <TrashIcon size={17} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
