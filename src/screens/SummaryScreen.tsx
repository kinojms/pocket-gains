import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { addSoreness } from '../data/repo'
import { recommendDefaults } from '../domain/defaults'
import { endEarlySuggestion } from '../domain/history'
import { countsForXp, levelFromXp, petLine, sessionXp, totalXp } from '../domain/pet'
import { PetSprite } from '../ui/PetSprite'

const SORENESS: { rating: 1 | 2 | 3; label: string }[] = [
  { rating: 1, label: '😀 Fine' },
  { rating: 2, label: '😐 A bit sore' },
  { rating: 3, label: '😣 Very sore' },
]

export function SummaryScreen() {
  const { sessionId } = useParams()
  const { db, ready, profile, history, afterWrite } = useAppData()
  const navigate = useNavigate()
  const [rated, setRated] = useState<1 | 2 | 3 | null>(null)

  if (!ready) return null
  const session = history.sessions.find((s) => s.id === sessionId)
  if (!session || !profile) return <Navigate to="/" replace />

  const sets = history.sets.filter((s) => s.sessionId === session.id)
  const done = sets.filter(countsForXp)
  const gained = sessionXp(history, session.id)
  const after = levelFromXp(totalXp(history))
  const leveledUp = after.level > levelFromXp(totalXp(history) - gained).level
  const complete = session.status === 'complete'
  const moment = leveledUp ? 'level_up' : complete ? 'summary_complete' : 'summary_partial'
  const onRamp = recommendDefaults(profile, history, new Date(session.startedAt)).stage !== 'target'
  const alreadyRated = history.soreness.some((c) => c.sessionId === session.id)
  const suggestion = complete ? null : endEarlySuggestion(history)

  const byExercise = new Map<string, typeof sets>()
  for (const s of sets) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s])

  async function rate(rating: 1 | 2 | 3) {
    setRated(rating)
    await addSoreness(db, session!.id, rating)
    await afterWrite()
  }

  return (
    <main className="screen full">
      <h1>{complete ? 'Hand cleared!' : 'Session saved'}</h1>
      <section className="pet-stage">
        <div className="bubble">{petLine(moment, session.id)}</div>
        <PetSprite size={140} bounce />
        <strong>{profile.petName} · Lv {after.level}{leveledUp ? ' ⬆' : ''}</strong>
        <span className="chip">+{gained} XP</span>
      </section>

      <section className="panel stack">
        <strong>{done.length} sets completed</strong>
        {[...byExercise.entries()].map(([exerciseId, list]) => (
          <div key={exerciseId} className="row spread">
            <span>{content.exercises[exerciseId]?.name ?? exerciseId}</span>
            <span className="muted">
              {list.map((s) => (s.stoppedForPain ? `${s.reps} (stopped: hurt)` : `${s.reps}${s.weightKg !== null ? `@${s.weightKg}kg` : ''}`)).join(' · ')}
            </span>
          </div>
        ))}
      </section>

      {suggestion && <p className="panel">💡 {suggestion.message}</p>}

      {onRamp && !alreadyRated && rated === null && (
        <section className="panel stack">
          <strong>How sore are you from recent sessions?</strong>
          <div className="row">
            {SORENESS.map((o) => (
              <button key={o.rating} className="btn" style={{ flex: 1 }} onClick={() => void rate(o.rating)}>{o.label}</button>
            ))}
          </div>
        </section>
      )}
      {rated !== null && (
        <p className="panel">
          {rated === 3
            ? "Thanks! We'll hold this week's settings a little longer so your body can catch up."
            : 'Thanks! Noted.'}
        </p>
      )}

      <button className="btn btn-primary btn-block" onClick={() => navigate('/', { replace: true })}>Done</button>
    </main>
  )
}
