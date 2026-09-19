import type { Notice } from '../data/types'
import { dday, fmtDate, fmtDateTime, isPast } from '../data/dates'
import { BookmarkIcon, BookmarkFillIcon, CloseIcon } from '../components/icons'
import './NoticeCard.css'

interface Props {
  notice: Notice
  reasons?: string[]
  saved: boolean
  onOpen: () => void
  onToggleSave: () => void
  onDismiss?: () => void // 관심 없음 (홈에서만)
  showDeadlineTag?: boolean
}

export function NoticeCard({
  notice,
  reasons,
  saved,
  onOpen,
  onToggleSave,
  onDismiss,
  showDeadlineTag = true,
}: Props) {
  const d = dday(notice.deadline)
  const closed = isPast(notice.deadline)

  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <article
      className="ncard"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      aria-label={`${notice.title} 상세 보기`}
    >
      <div className="ncard__top">
        <div className="ncard__meta">
          <span className="badge badge--purple">{notice.category}</span>
          <span className="ncard__source">{notice.source}</span>
        </div>
        <div className="ncard__actions" onClick={stop}>
          {onDismiss && (
            <button
              className="ncard__iconbtn"
              onClick={onDismiss}
              aria-label="관심 없음, 이 공지 숨기기"
              title="관심 없음"
            >
              <CloseIcon size={18} />
            </button>
          )}
          <button
            className={`ncard__iconbtn${saved ? ' is-saved' : ''}`}
            onClick={onToggleSave}
            aria-label={saved ? '저장 취소' : '저장'}
            aria-pressed={saved}
          >
            {saved ? <BookmarkFillIcon size={19} /> : <BookmarkIcon size={19} />}
          </button>
        </div>
      </div>

      <h3 className="ncard__title">{notice.title}</h3>

      {reasons && reasons.length > 0 && (
        <p className="ncard__reason">
          <span className="ncard__reason-tag">추천 이유</span>
          {reasons[0]}
          {reasons[1] ? ` ${reasons[1]}` : ''}
        </p>
      )}

      <div className="ncard__foot">
        <div className="ncard__dates">
          {showDeadlineTag && notice.deadline && (
            <span className={`ncard__deadline${closed ? ' is-closed' : ''}`}>
              마감 {fmtDate(notice.deadline)}
            </span>
          )}
          {!notice.deadline && <span className="ncard__deadline">상시 접수</span>}
          {notice.eventStart && (
            <span className="ncard__event">
              행사 {fmtDateTime(notice.eventStart, notice.eventHasTime)}
            </span>
          )}
          {!notice.eventStart && notice.eventNote && (
            <span className="ncard__event">{notice.eventNote}</span>
          )}
        </div>
        <span
          className={`badge ${
            d.done ? 'badge--done' : d.soon ? 'badge--soon' : 'badge--green'
          }`}
        >
          {d.label}
        </span>
      </div>
    </article>
  )
}
