import { useState } from 'react'
import { Link } from 'react-router'
import { content, imageUrl } from '../content'
import { useAppData } from '../data/AppData'
import { monthGrid } from '../domain/calendar'
import { bestSeries, trainedExercises } from '../domain/exerciseHistory'
import { recentSessions } from '../domain/history'
import { countsForXp } from '../domain/pet'
import { plannedDeckId } from '../domain/plan'
import { streakInfo } from '../domain/streak'
import { useNow } from '../hooks/useNow'
import { Icon } from '../ui/Icon'
import { MonthCalendar } from '../ui/MonthCalendar'
import { Sparkline } from '../ui/Sparkline'

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
      <div className="row spread">
        <h1>Progress</h1>
      </div>
      <p className="pill sync-pill" role="status">{syncStatusText(mode, dirtyCount, needsSignIn)}</p>
      {needsSignIn && <Link className="btn btn-primary btn-block" to="/login">Sign in to sync</Link>}
      <div className="tiles">
        <div className="tile" aria-label={`Current streak: ${streak.current} day${streak.current === 1 ? '' : 's'}`}>
          <Icon name="flame" className="tile-icon flame" size={26} />
          <strong className="stat">{streak.current}</strong>
          <span className="label">Streak</span>
        </div>
        <div className="tile" aria-label={`Best streak: ${streak.best} day${streak.best === 1 ? '' : 's'}`}>
          <Icon name="star" className="tile-icon gold" size={26} />
          <strong className="stat">{streak.best}</strong>
          <span className="label">Best</span>
        </div>
        <div className="tile" aria-label={streak.shieldAvailable ? 'Shield ready' : 'Shield used this week'}>
          <Icon name="shield" className="tile-icon shield" size={26} />
          <strong className="stat">{streak.shieldAvailable ? 1 : 0}</strong>
          <span className="label">Shield</span>
        </div>
        <div className="tile">
          <Icon name="calendar" className="tile-icon" size={26} />
          <strong className="stat">{all.length}</strong>
          <span className="label">Sessions</span>
        </div>
        <div className="tile">
          <Icon name="muscle" className="tile-icon" size={26} />
          <strong className="stat">{setsDone.length}</strong>
          <span className="label">Sets done</span>
        </div>
      </div>
      <MonthCalendar weeks={weeks} title={title} onPrev={() => move(-1)} onNext={() => move(1)} />
      <section className="stack">
        <h2>Exercises</h2>
        {exercises.length === 0 && <p className="muted">Your exercise history will show up here after your first session.</p>}
        {exercises.map((e) => {
          const ex = content.exercises[e.exerciseId]
          const img = imageUrl(e.exerciseId)
          const series = bestSeries(e.exerciseId, history)
          return (
            <Link key={e.exerciseId} className="panel ex-row" to={`/progress/exercise/${e.exerciseId}`} data-rarity={ex?.rarity ?? 1}>
              {img ? <img className="ex-thumb" src={img} alt="" /> : <span className="ex-thumb" />}
              <span className="stack ex-text">
                <strong>{ex?.name ?? e.exerciseId}</strong>
                <span className="muted">{e.sessions} session{e.sessions === 1 ? '' : 's'}</span>
              </span>
              <Sparkline values={series.values} width={80} height={32} label={`${series.byWeight ? 'Best weight' : 'Best reps'} trend`} />
              <Icon name="chevron-right" />
            </Link>
          )
        })}
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
                <span className={`chip ${s.status === 'complete' ? 'chip-good' : ''}`}>{s.status === 'complete' ? 'Complete' : 'Partial'}</span>
                <span className="muted">{count} set{count === 1 ? '' : 's'}</span>
              </span>
            </div>
          )
        })}
      </section>
    </main>
  )
}
