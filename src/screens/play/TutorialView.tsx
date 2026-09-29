import { useState } from 'react'
import { imageUrl, videoUrl } from '../../content'
import { repRangeFor, restSecFor } from '../../domain/session'
import type { Exercise, SessionSettings } from '../../domain/types'
import { PetSprite } from '../../ui/PetSprite'

export function TutorialView({ exercise, settings, mode, readyLabel, onReady }: {
  exercise: Exercise
  settings: SessionSettings
  mode: 'full' | 'refresher'
  readyLabel: string
  onReady(): void
}) {
  const [expanded, setExpanded] = useState(mode === 'full')
  const img = imageUrl(exercise.id)
  const [lo, hi] = repRangeFor(exercise, settings)
  return (
    <section className="stack play">
      <h1>{exercise.name}</h1>
      <span className="muted">
        {exercise.muscles.primary.join(' · ')} · {settings.sets} × {lo}–{hi}{exercise.perSide ? ' per side' : ''} · {restSecFor(exercise, settings)}s rest
      </span>
      {expanded ? (
        <>
          <div className="demo">{img ? <img src={img} alt={`${exercise.name} demonstration`} /> : <PetSprite size={120} />}</div>
          <a className="btn btn-ghost center-text" href={videoUrl(exercise)} target="_blank" rel="noreferrer">▶ Watch full tutorial</a>
          <div>
            <strong>How to</strong>
            <ol>{exercise.cues.map((c) => <li key={c}>{c}</li>)}</ol>
          </div>
          <div>
            <strong style={{ color: 'var(--danger)' }}>Avoid</strong>
            <ul>{exercise.mistakes.map((m) => <li key={m}>✗ {m}</li>)}</ul>
          </div>
        </>
      ) : (
        <>
          <p>💡 {exercise.cues[0]}</p>
          <button className="btn btn-ghost" onClick={() => setExpanded(true)}>Show full tutorial</button>
        </>
      )}
      <button className="btn btn-primary btn-block" onClick={onReady}>{readyLabel}</button>
    </section>
  )
}
