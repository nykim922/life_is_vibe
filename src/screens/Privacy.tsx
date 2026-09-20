import { useEffect } from 'react'
import policy from '../data/privacyPolicy.json'
import './Privacy.css'

export function Privacy() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = policy.title
    return () => { document.title = previousTitle }
  }, [])

  return (
    <div className="app-frame privacy-frame">
      <main className="privacy" id="privacy-content">
        <a className="privacy__back" href="/">← CampusFit 홈</a>
        <header>
          <p className="privacy__status">{policy.status}</p>
          <h1>{policy.title}</h1>
          <p className="privacy__date">초안 검토 기준일: {policy.reviewedAt}</p>
          <p>{policy.introduction}</p>
        </header>
        <nav className="privacy__contents" aria-label="개인정보처리방침 목차">
          <ul>
            {policy.sections.map((section) => (
              <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
            ))}
          </ul>
        </nav>
        {policy.sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
            <h2 id={`${section.id}-title`}>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
        <footer className="privacy__references">
          <p>관련 Google 안내</p>
          <ul>
            <li><a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a></li>
            <li><a href="https://developers.google.com/workspace/calendar/api/auth">Google Calendar 권한 범위</a></li>
            <li><a href="https://myaccount.google.com/connections">Google 계정 연결 관리</a></li>
          </ul>
          <a className="privacy__back" href="/">CampusFit 홈으로 돌아가기</a>
        </footer>
      </main>
    </div>
  )
}
