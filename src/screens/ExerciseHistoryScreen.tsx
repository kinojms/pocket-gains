import { Link, useParams } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { bestSeries, exerciseHistory } from '../domain/exerciseHistory'
import { Icon } from '../ui/Icon'
import { RarityCard } from '../ui/RarityCard'
import { Sparkline } from '../ui/Sparkline'

export function ExerciseHistoryScreen() {
  const { exerciseId = '' } = useParams()
  const { history, profile } = useAppData()
  // Wait for local data, so "No sets logged" never flashes while history loads.
  if (!profile) return null
  const exercise = content.exercises[exerciseId]
  const entries = exerciseHistory(exerciseId, history)
  const { values, byWeight } = bestSeries(exerciseId, history)
  const unit = byWeight ? ' kg' : ' reps'
  const label = `${byWeight ? 'Best weight' : 'Best reps'}: ${values[0]}${unit} → ${values[values.length - 1]}${unit}`

  return (
    <main className="screen">
      <Link className="row back-link" to="/progress"><Icon name="chevron-left" size={18} /> Progress</Link>
      <h1>{exercise?.name ?? exerciseId}</h1>
      {exercise && <div className="history-card"><RarityCard exercise={exercise} size="mini" /></div>}
      {entries.length === 0 ? (
        <p className="muted">No sets logged for this exercise yet.</p>
      ) : (
        <>
          <section className="panel stack">
            <span className="label">{byWeight ? 'Best weight per session' : 'Best reps per session'}</span>
            <Sparkline values={values} label={label} width={300} height={90} />
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
