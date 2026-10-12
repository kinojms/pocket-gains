import type { CalendarCell } from '../domain/calendar'

const MARK: Record<CalendarCell['status'], { icon: string; label: string }> = {
  done: { icon: '✅', label: 'trained' },
  bonus: { icon: '⭐', label: 'bonus session' },
  shielded: { icon: '🛡️', label: 'covered by shield' },
  missed: { icon: '✗', label: 'missed' },
  pending: { icon: '•', label: 'today, not trained yet' },
  rest: { icon: '', label: 'rest day' },
  future: { icon: '', label: 'upcoming' },
  none: { icon: '', label: 'before you started' },
}

export function MonthCalendar({ weeks, title, onPrev, onNext }: {
  weeks: CalendarCell[][]; title: string; onPrev(): void; onNext(): void
}) {
  const monthName = title.split(' ')[0]
  return (
    <section className="panel stack">
      <div className="row spread">
        <button className="btn btn-ghost round" aria-label="Previous month" onClick={onPrev}>‹</button>
        <h2>{title}</h2>
        <button className="btn btn-ghost round" aria-label="Next month" onClick={onNext}>›</button>
      </div>
      <div className="cal-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="cal-head">{d}</span>)}
        {weeks.flat().map((c) => (
          <div
            key={c.key}
            className={`cal-cell cal-${c.status}${c.inMonth ? '' : ' cal-out'}${c.deckId && c.status === 'future' ? ' cal-planned' : ''}`}
            aria-label={c.inMonth ? `${monthName} ${c.day}: ${MARK[c.status].label}` : undefined}
          >
            <span className="cal-day">{c.day}</span>
            <span className="cal-icon" aria-hidden="true">{MARK[c.status].icon}</span>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12 }}>✅ trained · 🛡️ shield · ✗ missed · ⭐ bonus · dot = planned</p>
    </section>
  )
}
