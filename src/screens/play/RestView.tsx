import { imageUrl } from '../../content'
import type { Exercise } from '../../domain/types'
import { formatClock } from '../../ui/format'
import { PetSprite } from '../../ui/PetSprite'

const CIRCUMFERENCE = 2 * Math.PI * 42

export function RestView({ exercise, remaining, totalMs, lastReps, range, nextLabel, onAdd, onSkip }: {
  exercise: Exercise
  remaining: number
  totalMs: number
  lastReps: number | null
  range: [number, number]
  nextLabel: string
  onAdd(): void
  onSkip(): void
}) {
  const img = imageUrl(exercise.id)
  const fraction = totalMs > 0 ? Math.min(1, remaining / totalMs) : 0
  return (
    <section className="stack play">
      <div className="ref">
        {img ? <img src={img} alt="" /> : <PetSprite size={48} />}
        {lastReps !== null && (
          <span>
            Last set: <b>{lastReps} reps</b>{' '}
            {lastReps >= range[0]
              ? <span style={{ color: 'var(--good)' }}>in range ✓</span>
              : <span className="muted">below range, and that's OK</span>}
          </span>
        )}
      </div>
      <div className="center">
        <svg width="220" height="220" viewBox="0 0 100 100" role="timer" aria-label={`Rest ${formatClock(remaining)} remaining`}>
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-2)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - fraction)} transform="rotate(-90 50 50)"
          />
          <text x="50" y="52" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--text)">{formatClock(remaining)}</text>
          <text x="50" y="66" textAnchor="middle" fontSize="7" fill="var(--muted)">REST</text>
        </svg>
      </div>
      <p className="muted center-text">{nextLabel}</p>
      <div className="row">
        <button className="btn" style={{ flex: 1 }} onClick={onAdd}>+15s</button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={onSkip}>Skip rest ▶</button>
      </div>
    </section>
  )
}
