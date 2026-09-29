import { content } from '../content'
import { useAppData } from '../data/AppData'
import { recentSessions } from '../domain/history'
import { countsForXp } from '../domain/pet'

export function syncStatusText(mode: 'local' | 'cloud', dirtyCount: number): string {
  if (mode === 'local') return 'Local mode: your data stays on this device.'
  if (dirtyCount > 0) return `● Not synced yet (${dirtyCount} change${dirtyCount === 1 ? '' : 's'})`
  return '✓ All changes synced'
}

export function ProgressScreen() {
  const { mode, history, dirtyCount } = useAppData()
  const all = recentSessions(history, Number.POSITIVE_INFINITY)
  const setsDone = history.sets.filter(countsForXp)
  return (
    <main className="screen">
      <h1>Progress</h1>
      <p className="muted" role="status">{syncStatusText(mode, dirtyCount)}</p>
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
      <section className="stack">
        <h2>Recent sessions</h2>
        {all.length === 0 && <p className="muted">No sessions yet. Your first hand is waiting on Home.</p>}
        {all.slice(0, 20).map((s) => {
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
