import type { Exercise } from '../../domain/types'
import { formatClock } from '../../ui/format'
import { Icon } from '../../ui/Icon'
import { Ring } from '../../ui/Ring'

export function WarmupView({ exercise, remaining, totalMs, onDone }: { exercise: Exercise; remaining: number; totalMs: number; onDone(): void }) {
  return (
    <section className="stack play">
      <div className="focus-head">
        <span className="focus-sub">Warm-up</span>
        <h1 className="focus-title">{exercise.name}</h1>
      </div>
      <div className="center">
        <div role="timer" aria-label={remaining > 0 ? `Warm-up ${formatClock(remaining)} remaining` : 'Warm-up done'}>
          <Ring value={totalMs > 0 ? remaining / totalMs : 0} size={190} color="var(--gold)" track="rgba(255,255,255,.22)">
            <span className="big-number ring-clock">{remaining > 0 ? formatClock(remaining) : <Icon name="check" size={56} />}</span>
          </Ring>
        </div>
      </div>
      <ol className="stack cue-list">
        {exercise.cues.map((c) => <li key={c}>{c}</li>)}
      </ol>
      <p className="focus-dim">Avoid: {exercise.mistakes.join(' · ')}</p>
      <div className="spacer" />
      <button className="btn btn-primary btn-block" onClick={onDone}>Start first card <Icon name="play" size={18} /></button>
    </section>
  )
}
