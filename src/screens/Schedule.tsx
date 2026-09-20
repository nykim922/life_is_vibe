import { useMemo, useState } from 'react'
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
import type { GoogleEvent, ScheduleItem } from '../data/types'
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  TrashIcon,
} from '../components/icons'
import './Schedule.css'

const WD = ['일', '월', '화', '수', '목', '금', '토']

type Row =
  | { type: 'service'; item: ScheduleItem; time: number }
  | { type: 'google'; item: GoogleEvent; time: number }

export function Schedule() {
  const {
    state,
    googleEvents,
    demoGoogleConnected,
    connectDemoGoogle,
    refreshDemoGoogle,
    removeSchedule,
  } = useStore()
  const toast = useToast()

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [selected, setSelected] = useState(() => todayMidnight())

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  // 날짜별 일정 유무(점 표시)
  const daysWithEvents = useMemo(() => {
    const set = new Set<string>()
    const mark = (iso: string) => set.add(todayMidnight(new Date(iso)).toDateString())
    state.scheduleItems.forEach((it) => mark(it.start))
    googleEvents.forEach((g) => mark(g.start))
    return set
  }, [state.scheduleItems, googleEvents])

  // 선택 날짜의 일정 (서비스 + 구글) 시간순 정렬
  const rows = useMemo<Row[]>(() => {
    const list: Row[] = []
    state.scheduleItems
      .filter((it) => sameDay(new Date(it.start), selected))
      .forEach((it) => list.push({ type: 'service', item: it, time: new Date(it.start).getTime() }))
    googleEvents
      .filter((g) => sameDay(new Date(g.start), selected))
      .forEach((g) => list.push({ type: 'google', item: g, time: new Date(g.start).getTime() }))
    return list.sort((a, b) => a.time - b.time)
  }, [state.scheduleItems, googleEvents, selected])

  const goToday = () => {
    const t = todayMidnight()
    setWeekStart(startOfWeek(t))
    setSelected(t)
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

      {/* 주간 네비 */}
      <div className="sched__weeknav">
        <button
          className="sched__navbtn"
          onClick={() => setWeekStart((w) => addDays(w, -7))}
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
          onClick={() => setWeekStart((w) => addDays(w, 7))}
          aria-label="다음 주"
        >
          <ChevronRightIcon size={20} />
        </button>
      </div>

      {/* 날짜 선택 */}
      <div className="sched__days">
        {weekDays.map((d) => {
          const isSel = sameDay(d, selected)
          const isToday = sameDay(d, todayMidnight())
          const hasEvent = daysWithEvents.has(d.toDateString())
          return (
            <button
              key={d.toISOString()}
              className={`sched__day${isSel ? ' is-sel' : ''}`}
              onClick={() => setSelected(todayMidnight(d))}
              aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일`}
              aria-pressed={isSel}
            >
              <span className="sched__dow">{WD[d.getDay()]}</span>
              <span className={`sched__date${isToday && !isSel ? ' is-today' : ''}`}>
                {d.getDate()}
              </span>
              <span className={`sched__dot${hasEvent ? ' is-on' : ''}`} aria-hidden="true" />
            </button>
          )
        })}
      </div>

      {/* 구글 캘린더 예시 미리보기 (데모 · 실제 구글 계정 조회 아님) */}
      {!demoGoogleConnected ? (
        <div className="sched__connect">
          <div className="sched__connect-icon">
            <CalendarIcon size={22} />
          </div>
          <p className="sched__connect-title">예시 일정 미리보기 (데모)</p>
          <p className="sched__connect-desc">
            추천 일정과 어떻게 함께 보이는지 확인하는 예시예요. 실제 구글 캘린더 일정을 불러오지는
            않아요. (내가 추가한 일정은 실제로 구글 캘린더에 저장됩니다.)
          </p>
          <button
            className="btn btn--line btn--block"
            onClick={() => {
              connectDemoGoogle()
              toast.show('예시 일정을 표시했어요')
            }}
          >
            예시 일정 표시하기
          </button>
        </div>
      ) : (
        <div className="sched__status">
          <span className="badge">예시 표시 중</span>
          <span className="sched__status-note">아래 '구글 캘린더 예시'는 데모 데이터예요</span>
          <button
            className="sched__refresh"
            onClick={() => {
              refreshDemoGoogle()
              toast.show('예시 일정을 새로고침했어요')
            }}
          >
            새로고침
          </button>
        </div>
      )}

      {/* 일정 목록 */}
      <div className="sched__list">
        {rows.length === 0 ? (
          <div className="empty">
            <p className="empty__title">이 날짜에 일정이 없어요</p>
            <p className="empty__desc">추천 공지 상세에서 일정을 추가할 수 있어요.</p>
          </div>
        ) : (
          rows.map((row) => {
            if (row.type === 'google') {
              const g = row.item
              return (
                <div key={g.id} className="sched__item sched__item--google">
                  <div className="sched__time">
                    {g.hasTime ? (
                      <>
                        <span>{fmtTime(g.start)}</span>
                        <span className="sched__time-end">{fmtTime(g.end)}</span>
                      </>
                    ) : (
                      <span>시간 미정</span>
                    )}
                  </div>
                  <div className="sched__body">
                    <div className="sched__badges">
                      <span className="badge">구글 캘린더 예시 (데모)</span>
                    </div>
                    <p className="sched__title">{g.title}</p>
                    {g.location && (
                      <p className="sched__loc">
                        <MapPinIcon size={14} /> {g.location}
                      </p>
                    )}
                  </div>
                </div>
              )
            }
            const it = row.item
            const isDeadline = it.kind === 'deadline'
            return (
              <div
                key={it.id}
                className={`sched__item${isDeadline ? ' sched__item--deadline' : ' sched__item--event'}`}
              >
                <div className="sched__time">
                  {it.hasTime ? (
                    <>
                      <span>{fmtTime(it.start)}</span>
                      {it.end && <span className="sched__time-end">{fmtTime(it.end)}</span>}
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
                    {it.googleEventId ? (
                      <span className="badge badge--green">구글 캘린더 저장됨</span>
                    ) : (
                      <span className="badge">서비스에서 추가</span>
                    )}
                    {it.notify !== 'none' && (
                      <span className="badge">
                        알림 {it.notify === 'hour' ? '1시간 전' : '하루 전'}
                      </span>
                    )}
                  </div>
                  <p className="sched__title">{it.title}</p>
                  {it.location && (
                    <p className="sched__loc">
                      <MapPinIcon size={14} /> {it.location}
                    </p>
                  )}
                  {!it.hasTime && (
                    <p className="sched__loc">
                      <ClockIcon size={14} /> 시간 미정 · 날짜 기준
                    </p>
                  )}
                  {it.googleHtmlLink && (
                    <a
                      className="sched__gcal-link"
                      href={it.googleHtmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      구글 캘린더에서 열기
                    </a>
                  )}
                </div>
                <button
                  className="sched__del"
                  onClick={() => {
                    // 앱 내부 기록만 삭제. 구글 캘린더의 실제 이벤트는 그대로 유지됨.
                    const ok = it.googleEventId
                      ? window.confirm(
                          '앱 목록에서만 제거할까요?\n구글 캘린더에 저장된 실제 일정은 삭제되지 않고 그대로 남아요.',
                        )
                      : true
                    if (!ok) return
                    removeSchedule(it.id)
                    toast.show(
                      it.googleEventId
                        ? '앱 목록에서 제거했어요 (구글 캘린더 일정은 유지)'
                        : '일정을 삭제했어요',
                    )
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
