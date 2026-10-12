import { NavLink } from 'react-router'
import { Icon, type IconName } from './Icon'

const TABS: { to: string; icon: IconName; label: string; end: boolean }[] = [
  { to: '/', icon: 'home', label: 'Home', end: true },
  { to: '/decks', icon: 'decks', label: 'Decks', end: false },
  { to: '/progress', icon: 'progress', label: 'Progress', end: false },
  { to: '/profile', icon: 'profile', label: 'Profile', end: false },
]

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className="tab">
          <span className="tab-icon"><Icon name={t.icon} size={24} /></span>
          <span className="tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
