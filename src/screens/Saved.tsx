import { useMemo } from 'react'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { NoticeCard } from './NoticeCard'

interface Props {
  onOpenDetail: (id: string) => void
  onBrowse: () => void
}

export function Saved({ onOpenDetail, onBrowse }: Props) {
  const { state, notices, toggleSave, isSaved } = useStore()
  const toast = useToast()

  const saved = useMemo(
    () => notices.filter((n) => state.savedIds.includes(n.id)),
    [notices, state.savedIds],
  )

  return (
    <div className="page">
      <h1 className="page__title">저장</h1>
      <p className="home__summary" style={{ marginBottom: 18 }}>
        저장한 기회 {saved.length}개
      </p>

      {saved.length === 0 ? (
        <div className="empty">
          <p className="empty__title">아직 저장한 기회가 없어요</p>
          <p className="empty__desc">추천에서 마음에 드는 공지를 저장해 보세요.</p>
          <button className="btn btn--primary" onClick={onBrowse}>
            추천 둘러보기
          </button>
        </div>
      ) : (
        <div>
          {saved.map((n) => (
            <NoticeCard
              key={n.id}
              notice={n}
              saved={isSaved(n.id)}
              onOpen={() => onOpenDetail(n.id)}
              onToggleSave={() => {
                toggleSave(n.id)
                toast.show('저장을 취소했어요')
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
