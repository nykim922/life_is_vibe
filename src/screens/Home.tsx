import { useEffect, useMemo, useRef } from 'react'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { recommend } from '../data/recommend'
import { CATEGORY_FILTERS } from '../data/options'
import { isWeekend } from '../data/dates'
import type { Category } from '../data/types'
import { NoticeCard } from './NoticeCard'
import { EditIcon } from '../components/icons'
import './Home.css'

type Sort = 'recommended' | 'deadline'

export interface HomeUiState {
  category: '전체' | Category
  online: boolean
  free: boolean
  weekend: boolean
  sort: Sort
  scrollTop: number
}

const DEFAULT_UI: HomeUiState = {
  category: '전체',
  online: false,
  free: false,
  weekend: false,
  sort: 'recommended',
  scrollTop: 0,
}

interface Props {
  onOpenDetail: (id: string) => void
  onEditProfile: () => void
  ui: HomeUiState | null
  onUiChange: (ui: HomeUiState) => void
}

export function Home({ onOpenDetail, onEditProfile, ui, onUiChange }: Props) {
  const { state, notices, isSaved, toggleSave, hide, unhide } = useStore()
  const toast = useToast()
  const profile = state.profile!

  const u = ui ?? DEFAULT_UI
  const set = (patch: Partial<HomeUiState>) => onUiChange({ ...u, ...patch })

  // 최신 UI 상태를 스크롤 핸들러에서 참조하기 위한 ref (stale closure 방지)
  const uRef = useRef(u)
  uRef.current = u
  const onUiChangeRef = useRef(onUiChange)
  onUiChangeRef.current = onUiChange

  // 상세 왕복 시 스크롤 위치 복원 + 스크롤 위치 저장
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current?.closest('.screen-scroll') as HTMLElement | null
    if (!el) return
    if (uRef.current.scrollTop) el.scrollTop = uRef.current.scrollTop
    const onScroll = () => onUiChangeRef.current({ ...uRef.current, scrollTop: el.scrollTop })
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const scored = useMemo(
    () => recommend(notices, profile, { hiddenIds: state.hiddenIds }),
    [notices, profile, state.hiddenIds],
  )

  const filtered = useMemo(() => {
    let list = scored
    if (u.category !== '전체') list = list.filter((s) => s.notice.category === u.category)
    if (u.online) list = list.filter((s) => s.notice.online)
    if (u.free) list = list.filter((s) => s.notice.cost === 'free')
    if (u.weekend) {
      // 행사가 토·일에 진행되는 경우만. 날짜 불명확한 공지는 제외.
      list = list.filter((s) => s.notice.eventStart && isWeekend(s.notice.eventStart))
    }
    if (u.sort === 'deadline') {
      list = [...list].sort((a, b) => {
        const ad = a.notice.deadline ? new Date(a.notice.deadline).getTime() : Infinity
        const bd = b.notice.deadline ? new Date(b.notice.deadline).getTime() : Infinity
        return ad - bd
      })
    }
    return list
  }, [scored, u])

  const summary = `${profile.major} · ${profile.grade}학년 · ${
    profile.interests.slice(0, 2).join(', ') || '관심분야 미설정'
  }`

  const anyFilter = u.category !== '전체' || u.online || u.free || u.weekend
  const resetFilters = () => set({ category: '전체', online: false, free: false, weekend: false })

  const onDismiss = (id: string, title: string) => {
    hide(id)
    toast.show(`'${title.slice(0, 14)}…' 숨김`, {
      actionLabel: '실행 취소',
      onAction: () => unhide(id),
    })
  }

  return (
    <div className="page" ref={scrollRef}>
      <div className="home__head">
        <div>
          <h1 className="page__title">맞춤 추천</h1>
          <p className="home__summary">{summary}</p>
        </div>
        <button className="home__edit" onClick={onEditProfile} aria-label="프로필 수정">
          <EditIcon size={18} />
          <span>수정</span>
        </button>
      </div>

      {/* 카테고리 필터 */}
      <div className="chiprow home__filters">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c}
            className={`chip${u.category === c ? ' is-on' : ''}`}
            aria-pressed={u.category === c}
            onClick={() => set({ category: c })}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 토글 필터 + 정렬 */}
      <div className="chiprow home__toggles">
        <button
          className={`chip chip--toggle${u.online ? ' is-on' : ''}`}
          aria-pressed={u.online}
          onClick={() => set({ online: !u.online })}
        >
          온라인만
        </button>
        <button
          className={`chip chip--toggle${u.free ? ' is-on' : ''}`}
          aria-pressed={u.free}
          onClick={() => set({ free: !u.free })}
        >
          무료만
        </button>
        <button
          className={`chip chip--toggle${u.weekend ? ' is-on' : ''}`}
          aria-pressed={u.weekend}
          onClick={() => set({ weekend: !u.weekend })}
        >
          주말만
        </button>
        <span className="home__sep" aria-hidden="true" />
        <button
          className={`chip${u.sort === 'recommended' ? ' is-on' : ''}`}
          aria-pressed={u.sort === 'recommended'}
          onClick={() => set({ sort: 'recommended' })}
        >
          추천순
        </button>
        <button
          className={`chip${u.sort === 'deadline' ? ' is-on' : ''}`}
          aria-pressed={u.sort === 'deadline'}
          onClick={() => set({ sort: 'deadline' })}
        >
          마감 임박순
        </button>
      </div>

      <p className="home__count">{filtered.length}개의 추천</p>

      {filtered.length === 0 ? (
        <div className="empty">
          <p className="empty__title">조건에 맞는 추천이 없어요</p>
          <p className="empty__desc">필터를 줄이면 더 많은 기회를 볼 수 있어요.</p>
          {anyFilter && (
            <button className="btn btn--line" onClick={resetFilters}>
              조건 초기화
            </button>
          )}
        </div>
      ) : (
        <div className="home__list">
          {filtered.map((s) => (
            <NoticeCard
              key={s.notice.id}
              notice={s.notice}
              reasons={s.reasons}
              saved={isSaved(s.notice.id)}
              onOpen={() => onOpenDetail(s.notice.id)}
              onToggleSave={() => toggleSave(s.notice.id)}
              onDismiss={() => onDismiss(s.notice.id, s.notice.title)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
