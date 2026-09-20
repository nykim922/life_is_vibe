import { useStore } from '../store'
import './Login.css'

// 구글 공식 색상의 'G' 로고 (SVG)
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export function Login() {
  const { loginWithGoogle } = useStore()

  return (
    <div className="login">
      <div className="login__hero">
        <span className="demo-pill">데모</span>
        <h1 className="login__brand">캠퍼스 비서</h1>
        <p className="login__lead">
          구글 계정으로 로그인하면
          <br />내 캘린더와 일정이 자동으로 연동돼요.
        </p>
      </div>

      <div className="login__card">
        <button
          type="button"
          className="google-btn"
          onClick={() => loginWithGoogle()}
        >
          <GoogleLogo size={20} />
          <span>구글로 로그인하기</span>
        </button>

        <ul className="login__benefits">
          <li>내 구글 캘린더 일정을 불러와요</li>
          <li>추천 일정을 캘린더에 바로 담아요</li>
          <li>기존 수업과 겹치면 알려줘요</li>
        </ul>

        <p className="login__note">
          * 데모 버전입니다. 실제 구글 인증은 배포 후 연결됩니다.
        </p>
      </div>
    </div>
  )
}
