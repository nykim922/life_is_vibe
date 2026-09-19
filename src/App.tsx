import { useState } from 'react'
import { StoreProvider, useStore } from './store'
import { ToastProvider } from './components/Toast'
import { BottomNav, type Tab } from './components/BottomNav'
import { Onboarding } from './screens/Onboarding'
import { Home } from './screens/Home'
import { Saved } from './screens/Saved'
import { Schedule } from './screens/Schedule'
import { ProfileScreen } from './screens/ProfileScreen'
import { NoticeDetail } from './screens/NoticeDetail'
import './components/ui.css'

type View =
  | { name: 'tab'; tab: Tab }
  | { name: 'detail'; noticeId: string; from: Tab }

function Shell() {
  const { state } = useStore()
  const [view, setView] = useState<View>({ name: 'tab', tab: 'home' })
  // 홈 필터/스크롤 상태를 상세를 오가도 유지하기 위해 상위에서 보관
  const [homeState, setHomeState] = useState<import('./screens/Home').HomeUiState | null>(null)

  // 온보딩 전에는 프로필 입력 화면만 (하단 탭 숨김)
  if (!state.onboarded || !state.profile) {
    return (
      <div className="app-frame">
        <div className="screen-scroll no-nav">
          <Onboarding />
        </div>
      </div>
    )
  }

  const openDetail = (noticeId: string, from: Tab) =>
    setView({ name: 'detail', noticeId, from })
  const goTab = (tab: Tab) => setView({ name: 'tab', tab })

  if (view.name === 'detail') {
    return (
      <div className="app-frame">
        <div className="screen-scroll no-nav">
          <NoticeDetail
            noticeId={view.noticeId}
            onBack={() => goTab(view.from)}
            onGoSchedule={() => goTab('schedule')}
          />
        </div>
      </div>
    )
  }

  const tab = view.tab

  return (
    <div className="app-frame">
      <div className="screen-scroll has-nav" key={tab}>
        {tab === 'home' && (
          <Home
            onOpenDetail={(id) => openDetail(id, 'home')}
            onEditProfile={() => goTab('profile')}
            ui={homeState}
            onUiChange={setHomeState}
          />
        )}
        {tab === 'saved' && (
          <Saved onOpenDetail={(id) => openDetail(id, 'saved')} onBrowse={() => goTab('home')} />
        )}
        {tab === 'schedule' && <Schedule />}
        {tab === 'profile' && <ProfileScreen />}
      </div>
      <BottomNav active={tab} onChange={goTab} />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </StoreProvider>
  )
}
