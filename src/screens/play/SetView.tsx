import { useState } from 'react'
import { imageUrl } from '../../content'
import { repRangeFor } from '../../domain/session'
import type { Exercise, SessionSettings } from '../../domain/types'
import { PetSprite } from '../../ui/PetSprite'

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
      <div className="row spread">
        <strong>{exercise.name}</strong>
        <span className="muted">Set {setNo} / {settings.sets}</span>
      </div>
      <button className="ref" onClick={onShowTutorial}>
        {img ? <img src={img} alt="" /> : <PetSprite size={48} />}
        <span className="stack" style={{ gap: 2 }}>
          <span>💡 {exercise.cues[0]}</span>
          <span className="muted">Tap for the full tutorial</span>
        </span>
      </button>

      <div className="stack center">
        <span className="label">
          Go! Target {lo}–{hi}{exercise.perSide ? ' per side' : ''} · stop {settings.rir[0]}–{settings.rir[1]} reps before failure
        </span>
        <div className="row center">
          <button className="btn round" aria-label="One fewer rep" onClick={() => setReps((r) => Math.max(0, r - 1))}>−</button>
          <output className="big-number" aria-label="Reps done">{reps}</output>
          <button className="btn round" aria-label="One more rep" onClick={() => setReps((r) => r + 1)}>+</button>
        </div>
        <span className="muted">reps done</span>
        {weight !== null && (
          <div className="row center">
            <button className="btn round" aria-label="Less weight" onClick={() => setWeight((w) => Math.max(0.5, (w ?? 1) - 1))}>−</button>
            <span className="stepper-value">{weight} kg</span>
            <button className="btn round" aria-label="More weight" onClick={() => setWeight((w) => (w ?? 0) + 1)}>+</button>
          </div>
        )}
      </div>

      <button className="btn btn-good btn-block" onClick={() => onLog(reps, weight)}>✓ Log set</button>
      <button className="btn btn-danger btn-block" onClick={() => onHurt(reps, weight)}>This hurts: stop this card</button>
    </section>
  )
}
