import { useState } from 'react'
import { Link } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { estimateMinutes, recommendDefaults } from '../domain/defaults'
import { addDays, dateKey, weekdayOf, WEEKDAY_LABELS } from '../domain/dates'
import { levelFromXp, petLine, totalXp } from '../domain/pet'
import { plannedDeckId } from '../domain/plan'
import { suggestNextDeck } from '../domain/recommender'
import { countedDays, streakInfo } from '../domain/streak'
import type { Deck } from '../domain/types'
import { useNow } from '../hooks/useNow'
import { PetSprite } from '../ui/PetSprite'

export function HomeScreen() {
  const { profile, history, plans, active } = useAppData()
  const [picking, setPicking] = useState(false)
  const nowMs = useNow(60_000)
  if (!profile) return null

  const now = new Date(nowMs)
  const ctx = { profile, history, plans }
  const streak = streakInfo(ctx, now)
  const { level, xpIntoLevel, xpForNext } = levelFromXp(totalXp(history))
  const rec = recommendDefaults(profile, history, now)
  const todayDeck = content.decks.find((d) => d.id === plannedDeckId(now, ctx))
  const doneToday = countedDays(history).has(dateKey(now))
  // Next scheduled day within a week, for rest days.
  let next: { deck: Deck; date: Date } | undefined
  for (let i = 1; i <= 7 && !next; i++) {
    const d = addDays(now, i)
    const deck = content.decks.find((x) => x.id === plannedDeckId(d, ctx))
    if (deck) next = { deck, date: d }
  }
  const primary = todayDeck ?? next?.deck ?? suggestNextDeck(content.decks, history)
  const line = active
    ? 'We were mid-session! Ready to jump back in?'
    : petLine(doneToday ? 'home_trained_today' : todayDeck ? 'home_fresh' : 'home_rest', now.toDateString())
  const activeDeck = active ? content.decks.find((d) => d.id === active.deckId) : undefined

  return (
    <main className="screen">
      <div className="row spread streak-row">
        <span className="streak" aria-label={`${streak.current}-day streak`}>🔥 {streak.current}</span>
        <span className="muted">{streak.shieldAvailable ? '🛡️ Shield ready' : '🛡️ Shield used this week'}</span>
      </div>
      <section className="pet-stage">
        <div className="bubble">{line}</div>
        <PetSprite size={200} bounce />
        <strong>{profile.petName} · Lv {level}</strong>
        <div className="xpbar" aria-label={`${xpIntoLevel} of ${xpForNext} XP to next level`}>
          <div style={{ width: `${(xpIntoLevel / xpForNext) * 100}%` }} />
        </div>
        <span className="muted">{xpIntoLevel} / {xpForNext} XP</span>
      </section>

      <section className="panel stack">
        {active ? (
          <>
            <span className="label">Session in progress</span>
            <strong>{activeDeck?.name}</strong>
            <Link className="btn btn-primary btn-block center-text" to="/session/play">Resume session ▶</Link>
          </>
        ) : (
          <>
            {todayDeck ? (
              <>
                <span className="label">
                  {doneToday ? 'Done for today ✓' : `Today · ${WEEKDAY_LABELS[weekdayOf(now)]}`}
                </span>
                <strong>{todayDeck.name}</strong>
                <span className="muted">{rec.settings.cards} cards · ~{estimateMinutes(rec.settings)} min</span>
                <Link className="btn btn-primary btn-block center-text" to={`/session/new/${todayDeck.id}`}>Deal my hand ▶</Link>
              </>
            ) : (
              <>
                <span className="label">Rest day</span>
                {next && <strong>Next up: {next.deck.name} on {WEEKDAY_LABELS[weekdayOf(next.date)]}</strong>}
                <Link className="btn btn-ghost btn-block center-text" to={`/session/new/${primary.id}`}>Train anyway ▶</Link>
              </>
            )}
            <button className="btn btn-ghost" onClick={() => setPicking((p) => !p)} aria-expanded={picking}>
              Pick a different deck
            </button>
            {picking &&
              content.decks
                .filter((d) => d.id !== primary.id)
                .map((d) => (
                  <Link key={d.id} className="choice" to={`/session/new/${d.id}`}>
                    <span className="stack" style={{ gap: 2 }}>
                      <strong>{d.name}</strong>
                      <span className="muted">{d.tagline}</span>
                    </span>
                  </Link>
                ))}
            <Link className="muted center-text" to="/plan">Edit my week</Link>
          </>
        )}
      </section>
    </main>
  )
}
