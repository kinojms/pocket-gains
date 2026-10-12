import { useState } from 'react'
import { imageUrl } from '../../content'
import { repRangeFor } from '../../domain/session'
import type { Exercise, SessionSettings } from '../../domain/types'
import { Icon } from '../../ui/Icon'
import { Pet } from '../../ui/Pet'
import { Pips } from '../../ui/Pips'
import { Ring } from '../../ui/Ring'

export function SetView({ exercise, settings, setNo, initialReps, initialWeight, onLog, onHurt, onShowTutorial }: {
  exercise: Exercise
  settings: SessionSettings
  setNo: number
  initialReps: number
  initialWeight: number | null
  onLog(reps: number, weightKg: number | null): void
  onHurt(reps: number, weightKg: number | null): void
  onShowTutorial(): void
}) {
  const [reps, setReps] = useState(initialReps)
  const [weight, setWeight] = useState(initialWeight)
  const [lo, hi] = repRangeFor(exercise, settings)
  const img = imageUrl(exercise.id)

  return (
    <section className="stack play">
      <div className="focus-head">
        <h1 className="focus-title">{exercise.name}</h1>
        <Pips done={setNo - 1} total={settings.sets} />
        <span className="focus-sub">Set {setNo} / {settings.sets}</span>
      </div>

      <div className="center">
        <Ring value={hi > 0 ? reps / hi : 0} size={210} color="var(--gold)" track="rgba(255,255,255,.22)">
          <output className="big-number" aria-label="Reps done">{reps}</output>
          <span className="ring-caption">reps done</span>
        </Ring>
        <div className="row center ring-controls">
          <button className="btn round" aria-label="One fewer rep" onClick={() => setReps((r) => Math.max(0, r - 1))}><Icon name="minus" /></button>
          <button className="btn round" aria-label="One more rep" onClick={() => setReps((r) => r + 1)}><Icon name="plus" /></button>
        </div>
      </div>
      <span className="label center-text">
        Go! Target {lo}–{hi}{exercise.perSide ? ' per side' : ''} · stop {settings.rir[0]}–{settings.rir[1]} reps before failure
      </span>
      {weight !== null && (
        <div className="row center">
          <button className="btn round" aria-label="Less weight" onClick={() => setWeight((w) => Math.max(0.5, (w ?? 1) - 1))}><Icon name="minus" /></button>
          <span className="stepper-value">{weight} kg</span>
          <button className="btn round" aria-label="More weight" onClick={() => setWeight((w) => (w ?? 0) + 1)}><Icon name="plus" /></button>
        </div>
      )}

      <button className="ref" onClick={onShowTutorial}>
        {img ? <img src={img} alt="" /> : <Pet size={48} />}
        <span className="stack" style={{ gap: 2 }}>
          <span className="row"><Icon name="bulb" size={16} /> {exercise.cues[0]}</span>
          <span className="focus-dim">Tap for the full tutorial</span>
        </span>
      </button>

      <div className="spacer" />
      <button className="btn btn-primary btn-block" data-feedback="log" onClick={() => onLog(reps, weight)}><Icon name="check" /> Log set</button>
      <button className="btn btn-danger btn-block" onClick={() => onHurt(reps, weight)}>This hurts: stop this card</button>
    </section>
  )
}
