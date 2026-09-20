import { useEffect, useMemo, useState } from 'react'
import { useStore, type AddScheduleOutcome } from '../store'
import { useToast } from '../components/Toast'
import { Sheet } from '../components/Sheet'
import type { Notice, NotifyOption, ScheduleKind } from '../data/types'
import { fmtDateTime, overlaps, fmtTime } from '../data/dates'
import { AlertIcon, CheckIcon } from '../components/icons'
import { fetchGoogleCalendarEvents, type CalendarEventItem } from '../data/api'
import './AddScheduleSheet.css'

interface Props {
  notice: Notice
  open: boolean
  onClose: () => void
  onGoSchedule: () => void
}

type KindChoice = 'deadline' | 'event' | 'both'

export function AddScheduleSheet({ notice, open, onClose, onGoSchedule }: Props) {
  const { addSchedule, hasSchedule } = useStore()
  const toast = useToast()

  const hasDeadline = Boolean(notice.deadline)
  const hasEvent = Boolean(notice.eventStart)

  const deadlineAdded = hasSchedule(notice.id, 'deadline')
  const eventAdded = hasSchedule(notice.id, 'event')

  const initialChoice: KindChoice = hasEvent && !eventAdded ? 'event' : 'deadline'
  const [choice, setChoice] = useState<KindChoice>(initialChoice)
  const [notify, setNotify] = useState<NotifyOption>('day')
  const [submitting, setSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<AddScheduleOutcome | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([])

  const eventHasTime = notice.eventHasTime
  const notifyDisabledHour =
    (choice === 'event' && !eventHasTime) ||
    (choice === 'deadline' && !notice.deadlineHasTime)

  useEffect(() => {
    if (!open || !notice.eventStart || !notice.eventHasTime) {
      setCalendarEvents([])
      return
    }
    const start = new Date(notice.eventStart).getTime()
    const parsedEnd = notice.eventEnd ? new Date(notice.eventEnd).getTime() : NaN
    const end = Number.isFinite(parsedEnd) && parsedEnd > start ? parsedEnd : start + 60 * 60 * 1000
    let cancelled = false
    void fetchGoogleCalendarEvents({
      timeMin: new Date(start).toISOString(),
      timeMax: new Date(end).toISOString(),
    })
      .then(({ items }) => {
        if (!cancelled) setCalendarEvents(items)
      })
      .catch(() => {
        if (!cancelled) setCalendarEvents([])
      })
    return () => {
      cancelled = true
    }
  }, [open, notice.eventEnd, notice.eventHasTime, notice.eventStart])

  // 실제 Google Calendar 일정과 겹치는지 안내한다.
  const conflicts = useMemo(() => {
    if (!hasEvent || !eventHasTime || !notice.eventStart) return []
    return calendarEvents.filter((event) =>
      overlaps(notice.eventStart!, notice.eventEnd, event.start, event.end),
    )
  }, [calendarEvents, hasEvent, eventHasTime, notice.eventEnd, notice.eventStart])

  const willAddEvent = choice === 'event' || choice === 'both'
  const showConflict = willAddEvent && conflicts.length > 0

  const kindsToAdd: ScheduleKind[] =
    choice === 'both' ? ['deadline', 'event'] : [choice]

  // 이미 추가된 항목은 제외
  const effectiveKinds = kindsToAdd.filter((k) =>
    k === 'deadline' ? !deadlineAdded : !eventAdded,
  )

  const canSubmit = effectiveKinds.length > 0 && !submitting

  const submit = async () => {
    if (submitting || effectiveKinds.length === 0) return // 중복 클릭 방지
    let notifyToUse = notify
    if (notifyDisabledHour && notify === 'hour') notifyToUse = 'day'

    setSubmitting(true)
    try {
      const res = await addSchedule(notice, effectiveKinds, notifyToUse)
      setOutcome(res)
      if (res.ok) {
        toast.show('구글 캘린더에 저장했어요')
      } else {
        toast.show(res.error ?? '저장에 실패했어요')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const close = () => {
    setOutcome(null)
    setChoice(initialChoice)
    setNotify('day')
    onClose()
  }

  const kindLabel = (k: KindChoice) =>
    k === 'deadline' ? '신청 마감' : k === 'event' ? '행사 일정' : '둘 다'

  const done = outcome?.ok === true

  return (
    <Sheet open={open} title="일정에 추가" onClose={close}>
      {done && outcome?.result ? (
        <div className="ash-done">
          <div className="ash-done__icon">
            <CheckIcon size={28} strokeWidth={2.6} />
          </div>
          <p className="ash-done__title">구글 캘린더에 저장했어요</p>
          <p className="ash-done__desc">
            {outcome.result.created.some((c) => c.duplicate)
              ? '이미 추가된 일정이 있어 중복 없이 반영했어요.'
              : '내 구글 캘린더 primary 일정에 추가됐어요.'}
          </p>

          {/* 생성된 각 이벤트의 구글 캘린더 열기 링크 */}
          <div className="ash-done__links">
            {outcome.result.created.map((c) => (
              <a
                key={c.eventId}
                className="btn btn--line btn--block"
                href={c.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.kind === 'deadline' ? '신청 마감 일정' : '행사 일정'} 구글 캘린더에서 열기
              </a>
            ))}
          </div>

          {/* 기본 길이 적용 안내 (종료 시각 미상) */}
          {outcome.result.created.some((c) => c.appliedDefaultDuration) && (
            <p className="ash__hint">
              종료 시각 정보가 없어 기본 1시간 길이로 저장했어요. 필요하면 구글 캘린더에서 조정해 주세요.
            </p>
          )}

          {/* 생성하지 못한 항목 안내 */}
          {outcome.result.skipped.length > 0 && (
            <p className="ash__hint">
              {outcome.result.skipped
                .map((s) => `${s.kind === 'deadline' ? '신청 마감' : '행사'}: ${s.reason}`)
                .join(' / ')}
            </p>
          )}

          <div className="ash-done__actions">
            <button className="btn btn--ghost" onClick={close}>
              닫기
            </button>
            <button
              className="btn btn--primary btn--block"
              onClick={() => {
                close()
                onGoSchedule()
              }}
            >
              내 일정 보기
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="ash__section-label">추가할 항목</p>
          <div className="ash__choices">
            {(['deadline', 'event', 'both'] as KindChoice[]).map((k) => {
              const disabled =
                (k === 'deadline' && (!hasDeadline || deadlineAdded)) ||
                (k === 'event' && (!hasEvent || eventAdded)) ||
                (k === 'both' &&
                  (!hasDeadline || !hasEvent || (deadlineAdded && eventAdded)))
              let reason = ''
              if (k === 'deadline' && !hasDeadline) reason = '마감 정보 없음'
              else if (k === 'deadline' && deadlineAdded) reason = '이미 추가됨'
              else if (k === 'event' && !hasEvent) reason = '행사 일정 정보 없음'
              else if (k === 'event' && eventAdded) reason = '이미 추가됨'
              else if (k === 'both' && (!hasDeadline || !hasEvent)) reason = '일부 정보 없음'
              else if (k === 'both' && deadlineAdded && eventAdded) reason = '이미 추가됨'
              return (
                <button
                  key={k}
                  className={`ash__choice${choice === k ? ' is-on' : ''}`}
                  aria-pressed={choice === k}
                  disabled={disabled || submitting}
                  onClick={() => setChoice(k)}
                >
                  <span className="ash__choice-title">{kindLabel(k)}</span>
                  <span className="ash__choice-sub">
                    {k === 'deadline' && hasDeadline
                      ? fmtDateTime(notice.deadline!, notice.deadlineHasTime)
                      : k === 'event' && hasEvent
                        ? fmtDateTime(notice.eventStart!, notice.eventHasTime)
                        : reason || '신청 마감 + 행사 일정'}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="ash__section-label">알림</p>
          <div className="ash__notify">
            {([
              { v: 'none', label: '알림 없음' },
              { v: 'hour', label: '1시간 전' },
              { v: 'day', label: '하루 전' },
            ] as Array<{ v: NotifyOption; label: string }>).map((o) => {
              const disabled = (o.v === 'hour' && notifyDisabledHour) || submitting
              return (
                <button
                  key={o.v}
                  className={`chip chip--toggle${notify === o.v ? ' is-on' : ''}`}
                  aria-pressed={notify === o.v}
                  disabled={disabled}
                  onClick={() => setNotify(o.v)}
                  title={disabled ? '시간 정보가 없어 선택할 수 없어요' : undefined}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
          {notifyDisabledHour && (
            <p className="ash__hint">시간 정보가 없는 일정이라 '1시간 전' 알림은 선택할 수 없어요.</p>
          )}

          {showConflict && (
            <div className="ash__conflict">
              <AlertIcon size={18} />
              <div>
                <strong>Google Calendar 일정과 겹쳐요</strong>
                <ul>
                  {conflicts.map((c) => (
                    <li key={c.id}>
                      {c.title} · {fmtTime(c.start)}~{fmtTime(c.end)}
                    </li>
                  ))}
                </ul>
                <span>연결된 캘린더 기준 안내예요. 확인 후에도 추가할 수 있어요.</span>
              </div>
            </div>
          )}

          {/* 저장 실패 안내 (성공으로 표시하지 않음) */}
          {outcome && outcome.ok === false && (
            <div className="ash__conflict">
              <AlertIcon size={18} />
              <div>
                <strong>저장하지 못했어요</strong>
                <span>{outcome.error ?? '잠시 후 다시 시도해 주세요.'}</span>
              </div>
            </div>
          )}

          <button
            className="btn btn--primary btn--block ash__submit"
            onClick={submit}
            disabled={!canSubmit}
          >
            {submitting
              ? '구글 캘린더에 저장 중…'
              : canSubmit
                ? '이 일정 추가하기'
                : '추가할 수 있는 항목이 없어요'}
          </button>
        </>
      )}
    </Sheet>
  )
}
