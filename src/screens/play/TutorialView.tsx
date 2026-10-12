import { useState } from 'react'
import { videoUrl } from '../../content'
import type { Exercise, SessionSettings } from '../../domain/types'
import { Icon } from '../../ui/Icon'
import { RarityCard } from '../../ui/RarityCard'

export function TutorialView({ exercise, settings, mode, readyLabel, onReady }: {
  exercise: Exercise
  settings: SessionSettings
  mode: 'full' | 'refresher'
  readyLabel: string
  onReady(): void
}) {
  const [expanded, setExpanded] = useState(mode === 'full')
  return (
    <section className="stack play">
      <RarityCard exercise={exercise} settings={settings} title="h1" wholeArt />
      {expanded ? (
        <>
          <a className="btn" href={videoUrl(exercise)} target="_blank" rel="noreferrer"><Icon name="video" /> Watch full tutorial</a>
          <div>
            <strong>How to</strong>
            <ol className="cue-list">{exercise.cues.map((c) => <li key={c}>{c}</li>)}</ol>
          </div>
          <div>
            <strong>Avoid</strong>
            <ul className="avoid-list">{exercise.mistakes.map((m) => <li key={m}><Icon name="close" size={14} /> {m}</li>)}</ul>
          </div>
        </>
      ) : (
        <>
          <p className="row"><Icon name="bulb" size={18} /> {exercise.cues[0]}</p>
          <button className="btn btn-ghost" onClick={() => setExpanded(true)}>Show full tutorial</button>
        </>
      )}
      <div className="spacer" />
      <button className="btn btn-primary btn-block" onClick={onReady}>{readyLabel}</button>
    </section>
  )
}
