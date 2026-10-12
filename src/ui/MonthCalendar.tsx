import type { CalendarCell } from '../domain/calendar'
import { Icon, type IconName } from './Icon'

const MARK: Record<CalendarCell['status'], { icon: IconName | null; label: string }> = {
  done: { icon: 'check', label: 'trained' },
  bonus: { icon: 'star', label: 'bonus session' },
  shielded: { icon: 'shield', label: 'covered by shield' },
  missed: { icon: 'close', label: 'missed' },
  pending: { icon: null, label: 'today, not trained yet' },
  rest: { icon: null, label: 'rest day' },
  future: { icon: null, label: 'upcoming' },
  none: { icon: null, label: 'before you started' },
}

export function MonthCalendar({ weeks, title, onPrev, onNext }: {
  weeks: CalendarCell[][]; title: string; onPrev(): void; onNext(): void
}) {
  const monthName = title.split(' ')[0]
  return (
    <section className="panel stack">
      <div className="row spread">
        <button className="btn round" aria-label="Previous month" onClick={onPrev}><Icon name="chevron-left" /></button>
        <h2>{title}</h2>
        <button className="btn round" aria-label="Next month" onClick={onNext}><Icon name="chevron-right" /></button>
      </div>
      <div className="cal-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="cal-head">{d}</span>)}
        {weeks.flat().map((c) => {
          const icon = MARK[c.status].icon
          return (
            <div
              key={c.key}
              className={`cal-cell cal-${c.status}${c.inMonth ? '' : ' cal-out'}${c.deckId && c.status === 'future' ? ' cal-planned' : ''}`}
              aria-label={c.inMonth ? `${monthName} ${c.day}: ${MARK[c.status].label}` : undefined}
            >
              <span className="cal-day">{c.day}</span>
              <span className="cal-icon">{icon && <Icon name={icon} size={12} />}</span>
            </div>
          )
        })}
      </div>
      <p className="cal-legend">
        <span><span className="cal-dot cal-done" /> trained</span>
        <span><Icon name="shield" size={14} /> shield</span>
        <span><Icon name="close" size={14} /> missed</span>
        <span><Icon name="star" size={14} /> bonus</span>
        <span><span className="cal-dot cal-planned-dot" /> planned</span>
      </p>
    </section>
  )
}
