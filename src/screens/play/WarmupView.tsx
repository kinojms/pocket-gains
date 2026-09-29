import type { Exercise } from '../../domain/types'
import { formatClock } from '../../ui/format'

export function WarmupView({ exercise, remaining, onDone }: { exercise: Exercise; remaining: number; onDone(): void }) {
  return (
    <section className="stack play">
      <h1>{exercise.name}</h1>
      <p className="big-number center-text" role="timer">{remaining > 0 ? formatClock(remaining) : 'Done ✓'}</p>
      <ol className="stack">
        {exercise.cues.map((c) => <li key={c}>{c}</li>)}
      </ol>
      <p className="muted">Avoid: {exercise.mistakes.join(' · ')}</p>
      <button className="btn btn-primary btn-block" onClick={onDone}>Start first card ▶</button>
    </section>
  )
}
