import { GridIcon, BookmarkIcon, CalendarIcon, UserIcon } from './icons'
import './BottomNav.css'

export type Tab = 'home' | 'saved' | 'schedule' | 'profile'

const ITEMS: Array<{ tab: Tab; label: string; Icon: typeof GridIcon }> = [
  { tab: 'home', label: '홈', Icon: GridIcon },
  { tab: 'saved', label: '저장', Icon: BookmarkIcon },
  { tab: 'schedule', label: '내 일정', Icon: CalendarIcon },
  { tab: 'profile', label: '프로필', Icon: UserIcon },
]

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottomnav" aria-label="주요 메뉴">
      <ul className="bottomnav__bar">
        {ITEMS.map(({ tab, label, Icon }) => {
          const isActive = tab === active
          return (
            <li key={tab} className="bottomnav__item">
              <button
                className={`bottomnav__btn${isActive ? ' is-active' : ''}`}
                onClick={() => onChange(tab)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={label}
              >
                <span className="bottomnav__iconwrap">
                  <Icon size={22} strokeWidth={2} />
                </span>
                <span className="bottomnav__label">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
