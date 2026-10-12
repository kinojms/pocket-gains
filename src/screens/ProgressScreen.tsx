import { useState } from 'react'
import { Link } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { monthGrid } from '../domain/calendar'
import { trainedExercises } from '../domain/exerciseHistory'
import { recentSessions } from '../domain/history'
import { countsForXp } from '../domain/pet'
import { plannedDeckId } from '../domain/plan'
import { streakInfo } from '../domain/streak'
import { useNow } from '../hooks/useNow'
import { MonthCalendar } from '../ui/MonthCalendar'

export function syncStatusText(mode: 'local' | 'cloud', dirtyCount: number, needsSignIn = false): string {
  if (mode === 'local') return 'Local mode: your data stays on this device.'
  if (needsSignIn) return '● Not syncing: sign in again to back up your training'
  if (dirtyCount > 0) return `● Not synced yet (${dirtyCount} change${dirtyCount === 1 ? '' : 's'})`
  return '✓ All changes synced'
}

export function ProgressScreen() {
  const { mode, history, dirtyCount, authChecked, signedIn, profile, plans } = useAppData()
  const nowMs = useNow(60_000)
  const [cursor, setCursor] = useState(() => ({ y: new Date(nowMs).getFullYear(), m: new Date(nowMs).getMonth() }))
  if (!profile) return null
  const needsSignIn = mode === 'cloud' && authChecked && !signedIn
  const now = new Date(nowMs)
  const ctx = { profile, history, plans }
  const streak = streakInfo(ctx, now)
  const weeks = monthGrid(cursor.y, cursor.m, streak, now, (d) => plannedDeckId(d, ctx))
  const title = new Date(cursor.y, cursor.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const move = (delta: number) => setCursor(({ y, m }) => {
    const d = new Date(y, m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const exercises = trainedExercises(history)
  const all = recentSessions(history, Number.POSITIVE_INFINITY)
  const setsDone = history.sets.filter(countsForXp)
  return (
    <main className="screen">
      <h1>Progress</h1>
      <p className="muted" role="status">{syncStatusText(mode, dirtyCount, needsSignIn)}</p>
      {needsSignIn && <Link className="btn btn-primary center-text" to="/login">Sign in to sync</Link>}
      <div className="row">
        <div className="panel stack" style={{ flex: 1 }}>
          <span className="label">Sessions</span>
          <strong className="stat">{all.length}</strong>
        </div>
        <div className="panel stack" style={{ flex: 1 }}>
          <span className="label">Sets done</span>
          <strong className="stat">{setsDone.length}</strong>
        </div>
      </div>
      <div className="row">
        <div className="panel stack" style={{ flex: 1 }} aria-label={`Current streak: ${streak.current} day${streak.current === 1 ? '' : 's'}`}>
          <span className="label">Streak</span>
          <strong className="stat">🔥 {streak.current}</strong>
        </div>
        <div className="panel stack" style={{ flex: 1 }} aria-label={`Best streak: ${streak.best} day${streak.best === 1 ? '' : 's'}`}>
          <span className="label">Best</span>
          <strong className="stat">{streak.best}</strong>
        </div>
      </div>
      <MonthCalendar weeks={weeks} title={title} onPrev={() => move(-1)} onNext={() => move(1)} />
      <section className="stack">
        <h2>Exercises</h2>
        {exercises.length === 0 && <p className="muted">Your exercise history will show up here after your first session.</p>}
        {exercises.map((e) => (
          <Link key={e.exerciseId} className="panel row spread" to={`/progress/exercise/${e.exerciseId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <strong>{content.exercises[e.exerciseId]?.name ?? e.exerciseId}</strong>
            <span className="muted">{e.sessions} session{e.sessions === 1 ? '' : 's'} ›</span>
          </Link>
        ))}
      </section>
      <section className="stack">
        <h2>Recent sessions</h2>
        {all.length === 0 && <p className="muted">No sessions yet. Your first hand is waiting on Home.</p>}
        {all.slice(0, 10).map((s) => {
          const count = setsDone.filter((x) => x.sessionId === s.id).length
          return (
            <div key={s.id} className="panel row spread">
              <span className="stack" style={{ gap: 2 }}>
                <strong>{content.decks.find((d) => d.id === s.deckId)?.name ?? s.deckId}</strong>
                <span className="muted">
                  {new Date(s.startedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </span>
              <span className="row">
                <span className="chip">{s.status === 'complete' ? 'Complete' : 'Partial'}</span>
                <span className="muted">{count} set{count === 1 ? '' : 's'}</span>
              </span>
            </div>
          )
        })}
      </section>
    </main>
  )
}
