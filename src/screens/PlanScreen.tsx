import { useState } from 'react'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { savePlan } from '../data/repo'
import { WEEKDAYS, WEEKDAY_LABELS } from '../domain/dates'
import { DEFAULT_SOURCES, recommendDefaults } from '../domain/defaults'
import { coverageWarnings, planFor, recommendedDays, type PlanDays } from '../domain/plan'
import type { Experience } from '../domain/types'
import { useNow } from '../hooks/useNow'
import { InfoSources } from '../ui/InfoSources'

export function PlanScreen() {
  const { profile, history, plans } = useAppData()
  const nowMs = useNow(60_000)
  if (!profile) return null
  const now = new Date(nowMs)
  const current = planFor(now, { profile, history, plans })
  const recommendedCount = recommendDefaults(profile, history, now).daysPerWeek
  return <PlanEditor initialDays={current.days} isCustom={current.isCustom} recommendedCount={recommendedCount} experience={profile.experience} />
}

function PlanEditor({ initialDays, isCustom, recommendedCount, experience }: {
  initialDays: PlanDays; isCustom: boolean; recommendedCount: number; experience: Experience
}) {
  const { db, afterWrite } = useAppData()
  const [days, setDays] = useState(initialDays)
  const [saved, setSaved] = useState(false)
  const warnings = coverageWarnings(days, content.decks)

  async function save(nextDays: PlanDays, custom: boolean) {
    // A recommended week remembers the experience it is based on, so a later profile edit can't rewrite it.
    await savePlan(db, nextDays, custom, new Date(), custom ? null : experience)
    await afterWrite()
    setDays(nextDays)
    setSaved(true)
  }

  return (
    <main className="screen">
      <h1>My week</h1>
      <p className="muted">
        {isCustom ? 'Your custom week.' : 'Using the recommended week. It adjusts as your on-ramp progresses.'}
      </p>
      <div className="panel stack">
        <span>Recommended right now: {recommendedCount} days a week, rotating decks so each muscle is trained about twice.</span>
        <InfoSources keys={DEFAULT_SOURCES.days} />
      </div>
      <section className="stack">
        {WEEKDAYS.map((w) => (
          <label key={w} className="row spread">
            <span>{WEEKDAY_LABELS[w]}</span>
            <select
              aria-label={WEEKDAY_LABELS[w]}
              value={days[w] ?? ''}
              onChange={(e) => {
                setDays({ ...days, [w]: e.target.value || null })
                setSaved(false)
              }}
            >
              <option value="">Rest</option>
              {content.decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        ))}
      </section>
      {warnings.map((w) => <p key={w} className="panel">⚠️ {w}</p>)}
      <button className="btn btn-primary btn-block" onClick={() => void save(days, true)}>Save my week</button>
      <button className="btn btn-ghost" onClick={() => void save(recommendedDays(recommendedCount), false)}>Use recommended</button>
      {saved && <p role="status">Saved ✓</p>}
      <p className="muted">Changes apply from today. Past days keep the plan they had, so your streak history never changes.</p>
    </main>
  )
}
