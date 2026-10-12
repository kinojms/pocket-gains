import { Link, useParams } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { exerciseHistory } from '../domain/exerciseHistory'
import { Sparkline } from '../ui/Sparkline'

export function ExerciseHistoryScreen() {
  const { exerciseId = '' } = useParams()
  const { history, profile } = useAppData()
  // Wait for local data, so "No sets logged" never flashes while history loads.
  if (!profile) return null
  const exercise = content.exercises[exerciseId]
  const entries = exerciseHistory(exerciseId, history)
  const chrono = [...entries].reverse().slice(-12)
  const byWeight = chrono.every((e) => e.bestWeight !== null) && chrono.length > 0
  const values = chrono.map((e) => (byWeight ? e.bestWeight! : e.bestReps))
  const unit = byWeight ? ' kg' : ' reps'
  const label = `${byWeight ? 'Best weight' : 'Best reps'}: ${values[0]}${unit} → ${values[values.length - 1]}${unit}`

  return (
    <main className="screen">
      <Link className="muted" to="/progress">‹ Progress</Link>
      <h1>{exercise?.name ?? exerciseId}</h1>
      {entries.length === 0 ? (
        <p className="muted">No sets logged for this exercise yet.</p>
      ) : (
        <>
          <section className="panel stack">
            <span className="label">{byWeight ? 'Best weight per session' : 'Best reps per session'}</span>
            <Sparkline values={values} label={label} />
          </section>
          <section className="stack">
            {entries.map((e) => (
              <div key={e.sessionId} className="panel row spread">
                <span className="muted">
                  {new Date(e.startedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span>{e.sets.map((s) => (s.weightKg !== null ? `${s.reps}×${s.weightKg} kg` : `${s.reps}`)).join(' · ')}</span>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  )
}
