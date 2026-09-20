import { useState } from 'react'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { ProfileForm } from './ProfileForm'
import { UserIcon, EditIcon } from '../components/icons'
import './ProfileScreen.css'

export function ProfileScreen() {
  const { state, auth, updateProfile, resetHidden, resetAll, logout } = useStore()
  const toast = useToast()
  const profile = state.profile!
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="page">
        <h1 className="page__title" style={{ marginBottom: 18 }}>
          프로필 수정
        </h1>
        <ProfileForm
          initial={profile}
          submitLabel="저장"
          onCancel={() => setEditing(false)}
          onSubmit={(p) => {
            updateProfile(p)
            setEditing(false)
            toast.show('프로필을 수정했어요. 추천이 업데이트돼요')
          }}
        />
      </div>
    )
  }

  const confirmReset = () => {
    if (
      window.confirm(
        '앱 데이터를 초기화할까요? 프로필, 저장, 숨김, 앱 내 일정 기록이 지워집니다.\n(이미 구글 캘린더에 저장된 실제 일정은 삭제되지 않아요.)',
      )
    ) {
      resetAll()
    }
  }

  return (
    <div className="pscreen">
      {/* 보라색 헤더 */}
      <div className="pscreen__hero">
        <div className="pscreen__hero-top">
          <span className="pscreen__title">프로필</span>
          <button
            className="pscreen__edit"
            onClick={() => setEditing(true)}
            aria-label="프로필 수정"
          >
            <EditIcon size={18} />
          </button>
        </div>
      </div>

      {/* 흰색 정보 영역 */}
      <div className="pscreen__sheet">
        <div className="pscreen__avatar">
          <UserIcon size={34} strokeWidth={1.8} />
        </div>
        <p className="pscreen__major">{profile.major}</p>
        <p className="pscreen__grade">{profile.grade}학년</p>

        <div className="pscreen__info">
          <div className="pscreen__row">
            <span className="pscreen__k">관심 분야</span>
            <div className="pscreen__chips">
              {profile.interests.map((i) => (
                <span key={i} className="badge badge--purple">
                  {i}
                </span>
              ))}
            </div>
          </div>
          <div className="pscreen__row">
            <span className="pscreen__k">현재 목표</span>
            <div className="pscreen__chips">
              {profile.goals.map((g) => (
                <span key={g} className="badge">
                  {g}
                </span>
              ))}
            </div>
          </div>
          {profile.context && (
            <div className="pscreen__row">
              <span className="pscreen__k">추가 맥락</span>
              <p className="pscreen__context">{profile.context}</p>
            </div>
          )}
        </div>

        <button className="btn btn--line btn--block" onClick={() => setEditing(true)}>
          프로필 수정
        </button>

        {/* 설정 */}
        <h2 className="pscreen__section">설정</h2>
        <div className="pscreen__settings">
          <div className="pscreen__setting">
            <div>
              <p className="pscreen__setting-title">구글 계정</p>
              <p className="pscreen__setting-sub">{auth.email ?? '로그인 정보 없음'}</p>
            </div>
            <span className="badge badge--green">로그인됨</span>
          </div>

          <div className="pscreen__setting">
            <div>
              <p className="pscreen__setting-title">구글 캘린더 권한</p>
              <p className="pscreen__setting-sub">
                {auth.calendarConnected
                  ? '일정 생성 권한 있음'
                  : '권한 없음 (다시 로그인 필요)'}
              </p>
            </div>
            <span className={`badge ${auth.calendarConnected ? 'badge--green' : ''}`}>
              {auth.calendarConnected ? '연결됨' : '미연결'}
            </span>
          </div>

          <button
            className="pscreen__setting pscreen__setting--btn"
            onClick={() => {
              resetHidden()
              toast.show('숨긴 추천을 초기화했어요')
            }}
          >
            <div>
              <p className="pscreen__setting-title">숨긴 추천 초기화</p>
              <p className="pscreen__setting-sub">
                관심 없음으로 숨긴 공지 {state.hiddenIds.length}개 다시 보기
              </p>
            </div>
          </button>

          <button
            className="pscreen__setting pscreen__setting--btn"
            onClick={async () => {
              await logout()
              toast.show('로그아웃했어요')
            }}
          >
            <div>
              <p className="pscreen__setting-title">로그아웃</p>
              <p className="pscreen__setting-sub">
                프로필·저장·일정 데이터는 지우지 않고 로그인만 해제합니다
              </p>
            </div>
          </button>

          <button
            className="pscreen__setting pscreen__setting--btn pscreen__setting--danger"
            onClick={confirmReset}
          >
            <div>
              <p className="pscreen__setting-title">앱 데이터 초기화</p>
              <p className="pscreen__setting-sub">
                프로필·저장·앱 내 일정 기록을 지웁니다 (구글 캘린더 일정은 유지)
              </p>
            </div>
          </button>
        </div>

        <div className="demo-note pscreen__demo">
          <span>
            로그인과 일정 저장은 실제 구글 캘린더에 연동돼요. 추천/AI 및 예시 캘린더 표시는 데모
            데이터로 동작합니다.
          </span>
        </div>
      </div>
    </div>
  )
}
