import { useState } from 'react'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { ProfileForm } from './ProfileForm'
import { UserIcon, EditIcon } from '../components/icons'
import './ProfileScreen.css'

export function ProfileScreen() {
  const { state, updateProfile, resetHidden, resetAll } = useStore()
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
        '전체 데모를 초기화할까요? 프로필, 저장, 숨김, 일정, 캘린더 연결이 모두 지워집니다.',
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
              <p className="pscreen__setting-title">구글 캘린더 데모 연결</p>
              <p className="pscreen__setting-sub">
                {state.googleConnected ? '데모 연결됨' : '연결 안 됨'}
              </p>
            </div>
            <span className={`badge ${state.googleConnected ? 'badge--green' : ''}`}>
              {state.googleConnected ? '연결됨' : '미연결'}
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
            className="pscreen__setting pscreen__setting--btn pscreen__setting--danger"
            onClick={confirmReset}
          >
            <div>
              <p className="pscreen__setting-title">전체 데모 초기화</p>
              <p className="pscreen__setting-sub">프로필과 저장 상태를 모두 지웁니다</p>
            </div>
          </button>
        </div>

        <div className="demo-note pscreen__demo">
          <span>이 앱은 데모예요. 실제 로그인·AI·크롤링·캘린더 연동 없이 동작합니다.</span>
        </div>
      </div>
    </div>
  )
}
