import { NavLink } from 'react-router'

const TABS = [
  { to: '/', icon: '🏠', label: 'Home', end: true },
  { to: '/decks', icon: '🃏', label: 'Decks', end: false },
  { to: '/progress', icon: '📊', label: 'Progress', end: false },
  { to: '/profile', icon: '⚙️', label: 'Profile', end: false },
]

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className="tab">
          <span aria-hidden="true" className="tab-icon">{t.icon}</span>
          <span className="tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
