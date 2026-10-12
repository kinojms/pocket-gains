import { imageUrl } from '../../content'
import type { Exercise } from '../../domain/types'
import { formatClock } from '../../ui/format'
import { Icon } from '../../ui/Icon'
import { Pet } from '../../ui/Pet'
import { Ring } from '../../ui/Ring'

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
  return (
    <section className="stack play">
      <div className="ref">
        {img ? <img src={img} alt="" /> : <Pet size={48} />}
        {lastReps !== null && (
          <span>
            Last set: <b>{lastReps} reps</b>{' '}
            {lastReps >= range[0]
              ? <span className="row in-range"><Icon name="check" size={16} /> in range</span>
              : <span className="focus-dim">below range, and that's OK</span>}
          </span>
        )}
      </div>
      <div className="center">
        <div role="timer" aria-label={`Rest ${formatClock(remaining)} remaining`}>
          <Ring value={totalMs > 0 ? remaining / totalMs : 0} size={220} color="var(--gold)" track="rgba(255,255,255,.22)">
            <span className="big-number ring-clock">{formatClock(remaining)}</span>
            <span className="ring-caption">REST</span>
          </Ring>
        </div>
      </div>
      <p className="center-text focus-dim">{nextLabel}</p>
      <div className="spacer" />
      <div className="row">
        <button className="btn" style={{ flex: 1 }} onClick={onAdd}><Icon name="plus" size={18} /> 15s</button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={onSkip}>Skip rest <Icon name="play" size={18} /></button>
      </div>
    </section>
  )
}
