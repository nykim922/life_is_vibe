import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { buildReasons, isEligible } from '../data/recommend'
import { dday, fmtDateTime, isPast } from '../data/dates'
import { AddScheduleSheet } from './AddScheduleSheet'
import {
  BookmarkFillIcon,
  BookmarkIcon,
  ChevronLeftIcon,
  LinkIcon,
  PlusIcon,
} from '../components/icons'
import './NoticeDetail.css'

interface Props {
  noticeId: string
  onBack: () => void
  onGoSchedule: () => void
}

export function NoticeDetail({ noticeId, onBack, onGoSchedule }: Props) {
  const { notices, state, isSaved, toggleSave } = useStore()
  const toast = useToast()
  const notice = notices.find((n) => n.id === noticeId)
  const profile = state.profile!

  const [sheetOpen, setSheetOpen] = useState(false)
  const [linkNotice, setLinkNotice] = useState(false)

  const reasons = useMemo(
    () => (notice ? buildReasons(notice, profile) : []),
    [notice, profile],
  )

  if (!notice) {
    return (
      <div className="page">
        <button className="btn btn--line" onClick={onBack}>
          돌아가기
        </button>
        <p className="muted" style={{ marginTop: 16 }}>
          공지를 찾을 수 없어요.
        </p>
      </div>
    )
  }

  const saved = isSaved(notice.id)
  const closed = isPast(notice.deadline)
  const d = dday(notice.deadline)
  const eligible = isEligible(notice, profile)

  return (
    <div className="detail">
      <div className="topbar">
        <button className="topbar__back" onClick={onBack} aria-label="뒤로 가기">
          <ChevronLeftIcon size={22} />
        </button>
        <span className="topbar__title">공지 상세</span>
      </div>

      <div className="detail__body">
        <div className="detail__meta">
          <span className="badge badge--purple">{notice.category}</span>
          <span className="detail__source">{notice.source}</span>
        </div>

        <h1 className="detail__title">{notice.title}</h1>

        <div className="detail__tags">
          <span className={`badge ${d.done ? 'badge--done' : d.soon ? 'badge--soon' : 'badge--green'}`}>
            {d.label}
          </span>
          <span className="badge">{notice.cost === 'free' ? '무료' : '유료'}</span>
          <span className="badge">{notice.online ? '온라인' : '오프라인'}</span>
        </div>

        {/* 핵심 요약 */}
        <section className="detail__card">
          <h2 className="detail__h">핵심 내용</h2>
          <p className="detail__text">{notice.summary}</p>
          <p className="detail__text detail__text--soft">{notice.detail}</p>
        </section>

        {/* 추천 이유 */}
        <section className="detail__card detail__card--reason">
          <h2 className="detail__h">나에게 추천하는 이유</h2>
          <ul className="detail__reasons">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>

        {/* 정보 목록 */}
        <section className="detail__card">
          <h2 className="detail__h">신청 정보</h2>
          <dl className="detail__info">
            <div>
              <dt>지원 자격</dt>
              <dd>
                {notice.eligibleGrades.length > 0
                  ? `${notice.eligibleGrades.join(', ')}학년`
                  : '학년 무관'}
                {' · '}
                {notice.eligibleMajors.length > 0
                  ? notice.eligibleMajors.join(', ')
                  : '전공 무관'}
                {notice.needsEligibilityCheck && (
                  <span className="badge badge--check detail__inline-badge">확인 필요</span>
                )}
                {!eligible && (
                  <span className="badge badge--done detail__inline-badge">자격 미충족</span>
                )}
                {notice.eligibilityNote && (
                  <span className="detail__note">{notice.eligibilityNote}</span>
                )}
              </dd>
            </div>
            <div>
              <dt>비용</dt>
              <dd>
                {notice.cost === 'free' ? '무료' : '유료'}
                {notice.costNote && <span className="detail__note">{notice.costNote}</span>}
              </dd>
            </div>
            <div>
              <dt>진행 방식</dt>
              <dd>{notice.online ? '온라인' : `오프라인 · ${notice.location ?? '장소 추후 안내'}`}</dd>
            </div>
            <div>
              <dt>신청 마감</dt>
              <dd className={closed ? 'detail__closed' : ''}>
                {notice.deadline ? fmtDateTime(notice.deadline, notice.deadlineHasTime) : '상시 접수'}
                {closed && (
                  <span className="badge badge--done detail__inline-badge">마감됨</span>
                )}
              </dd>
            </div>
            <div>
              <dt>행사 일시</dt>
              <dd>
                {notice.eventStart
                  ? fmtDateTime(notice.eventStart, notice.eventHasTime)
                  : notice.eventNote
                    ? notice.eventNote
                    : '행사 일정 미정'}
                {notice.eventNote && notice.eventStart && (
                  <span className="detail__note">{notice.eventNote}</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {/* 일정 충돌 안내 */}
        <div className="demo-note detail__demo">
          <span>
            {state.googleConnected
              ? '일정에 추가할 때 기존 구글 일정과 겹치는지 확인해 드려요.'
              : '구글 캘린더 데모를 연결하면 기존 일정과 겹치는지 비교해 드려요.'}
          </span>
        </div>

        {linkNotice && (
          <div className="demo-note detail__demo">
            <span>예시 공지라 실제 신청 페이지는 없어요. 데모용 화면입니다.</span>
          </div>
        )}
      </div>

      {/* 하단 행동 버튼 (탭바 대신) */}
      <div className="detail__actions">
        <button
          className={`detail__save${saved ? ' is-saved' : ''}`}
          onClick={() => {
            toggleSave(notice.id)
            toast.show(saved ? '저장을 취소했어요' : '저장했어요')
          }}
          aria-label={saved ? '저장 취소' : '저장'}
          aria-pressed={saved}
        >
          {saved ? <BookmarkFillIcon size={22} /> : <BookmarkIcon size={22} />}
        </button>
        <button
          className="btn btn--line detail__link"
          onClick={() => {
            setLinkNotice(true)
            toast.show('예시 공지라 실제 신청 페이지는 없어요')
          }}
        >
          <LinkIcon size={18} />
          신청 페이지
        </button>
        <button className="btn btn--primary detail__add" onClick={() => setSheetOpen(true)}>
          <PlusIcon size={18} />
          일정에 추가
        </button>
      </div>

      <AddScheduleSheet
        notice={notice}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onGoSchedule={onGoSchedule}
      />
    </div>
  )
}
