import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { Sheet } from '../components/Sheet'
import type { Notice, NotifyOption, ScheduleKind } from '../data/types'
import { fmtDateTime, overlaps, fmtTime } from '../data/dates'
import { AlertIcon, CheckIcon } from '../components/icons'
import './AddScheduleSheet.css'

interface Props {
  notice: Notice
  open: boolean
  onClose: () => void
  onGoSchedule: () => void
}

type KindChoice = 'deadline' | 'event' | 'both'

export function AddScheduleSheet({ notice, open, onClose, onGoSchedule }: Props) {
  const { addSchedule, hasSchedule, googleEvents } = useStore()
  const toast = useToast()

  const hasDeadline = Boolean(notice.deadline)
  const hasEvent = Boolean(notice.eventStart)

  const deadlineAdded = hasSchedule(notice.id, 'deadline')
  const eventAdded = hasSchedule(notice.id, 'event')

  // 선택 가능한 기본값 결정
  const initialChoice: KindChoice = hasEvent && !eventAdded ? 'event' : 'deadline'
  const [choice, setChoice] = useState<KindChoice>(initialChoice)
  const [notify, setNotify] = useState<NotifyOption>('day')
  const [done, setDone] = useState(false)

  // 행사 시간 정보가 없으면 '1시간 전' 알림 비활성 (날짜 기준 알림만)
  const eventHasTime = notice.eventHasTime
  const notifyDisabledHour =
    (choice === 'event' && !eventHasTime) ||
    (choice === 'deadline' && !notice.deadlineHasTime)

  // 일정 충돌 검사: 행사(시간 있음) vs 구글 일정
  const conflicts = useMemo(() => {
    if (!hasEvent || !eventHasTime || !notice.eventStart) return []
    return googleEvents.filter((g) =>
      overlaps(notice.eventStart!, notice.eventEnd, g.start, g.end),
    )
  }, [googleEvents, hasEvent, eventHasTime, notice])

  const willAddEvent = choice === 'event' || choice === 'both'
  const showConflict = willAddEvent && conflicts.length > 0

  const kindsToAdd: ScheduleKind[] =
    choice === 'both' ? ['deadline', 'event'] : [choice]

  // 이미 추가된 항목은 제외
  const effectiveKinds = kindsToAdd.filter((k) =>
    k === 'deadline' ? !deadlineAdded : !eventAdded,
  )

  const canSubmit = effectiveKinds.length > 0

  const submit = () => {
    let notifyToUse = notify
    if (notifyDisabledHour && notify === 'hour') notifyToUse = 'day'
    effectiveKinds.forEach((k) => addSchedule(notice, k, notifyToUse))
    setDone(true)
  }

  const close = () => {
    setDone(false)
    setChoice(initialChoice)
    setNotify('day')
    onClose()
  }

  const kindLabel = (k: KindChoice) =>
    k === 'deadline' ? '신청 마감' : k === 'event' ? '행사 일정' : '둘 다'

  return (
    <Sheet open={open} title="일정에 추가" onClose={close}>
      {done ? (
        <div className="ash-done">
          <div className="ash-done__icon">
            <CheckIcon size={28} strokeWidth={2.6} />
          </div>
          <p className="ash-done__title">데모 일정에 추가했어요</p>
          <p className="ash-done__desc">등록 완료. 내 일정에서 확인할 수 있어요.</p>
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
                  disabled={disabled}
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
              const disabled = o.v === 'hour' && notifyDisabledHour
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
                <strong>기존 일정과 겹쳐요</strong>
                <ul>
                  {conflicts.map((c) => (
                    <li key={c.id}>
                      {c.title} · {fmtTime(c.start)}~{fmtTime(c.end)}
                    </li>
                  ))}
                </ul>
                <span>확인 후에도 추가할 수 있어요.</span>
              </div>
            </div>
          )}

          <div className="demo-note ash__demo">
            <span>실제 알림은 발송되지 않는 데모예요. 선택값만 저장됩니다.</span>
          </div>

          <button
            className="btn btn--primary btn--block ash__submit"
            onClick={() => {
              submit()
              toast.show('데모 일정에 추가했어요')
            }}
            disabled={!canSubmit}
          >
            {canSubmit ? '이 일정 추가하기' : '추가할 수 있는 항목이 없어요'}
          </button>
        </>
      )}
    </Sheet>
  )
}
