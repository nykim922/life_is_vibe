import { useStore } from '../store'
import { ProfileForm } from './ProfileForm'
import { EXAMPLE_PROFILE } from '../data/options'
import './Onboarding.css'

export function Onboarding() {
  const { completeOnboarding } = useStore()

  return (
    <div className="onb">
      <header className="onb__hero">
        <span className="demo-pill">데모</span>
        <h1 className="onb__brand">캠퍼스 비서</h1>
        <p className="onb__lead">흩어진 공지에서 나에게 맞는 기회를 찾아보세요.</p>
      </header>

      <div className="onb__card">
        <button
          type="button"
          className="btn btn--dark btn--block onb__example"
          onClick={() => completeOnboarding(EXAMPLE_PROFILE)}
        >
          예시 프로필로 시작하기
        </button>
        <p className="onb__example-desc">
          전자공학부 · 3학년 · 반도체, 공정·장비 · 직무 탐색, 교육 수강
        </p>

        <div className="onb__divider">
          <span>또는 직접 입력하기</span>
        </div>

        <ProfileForm submitLabel="맞춤 추천 보기" onSubmit={completeOnboarding} />
      </div>
    </div>
  )
}
