import { useState } from 'react'
import { Link } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { estimateMinutes, recommendDefaults } from '../domain/defaults'
import { trainedToday } from '../domain/history'
import { levelFromXp, petLine, totalXp } from '../domain/pet'
import { suggestNextDeck } from '../domain/recommender'
import { useNow } from '../hooks/useNow'
import { PetSprite } from '../ui/PetSprite'

export function HomeScreen() {
  const { profile, history, active } = useAppData()
  const [picking, setPicking] = useState(false)
  const nowMs = useNow(60_000)
  if (!profile) return null

  const now = new Date(nowMs)
  const { level, xpIntoLevel, xpForNext } = levelFromXp(totalXp(history))
  const suggested = suggestNextDeck(content.decks, history)
  const rec = recommendDefaults(profile, history, now)
  const line = active
    ? 'We were mid-session! Ready to jump back in?'
    : petLine(trainedToday(history, now) ? 'home_trained_today' : 'home_fresh', now.toDateString())
  const activeDeck = active ? content.decks.find((d) => d.id === active.deckId) : undefined

  return (
    <main className="screen">
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
            <span className="label">Today · {now.toLocaleDateString(undefined, { weekday: 'long' })}</span>
            <strong>{suggested.name}</strong>
            <span className="muted">{rec.settings.cards} cards · ~{estimateMinutes(rec.settings)} min</span>
            <Link className="btn btn-primary btn-block center-text" to={`/session/new/${suggested.id}`}>Deal my hand ▶</Link>
            <button className="btn btn-ghost" onClick={() => setPicking((p) => !p)} aria-expanded={picking}>
              Pick a different deck
            </button>
            {picking &&
              content.decks
                .filter((d) => d.id !== suggested.id)
                .map((d) => (
                  <Link key={d.id} className="choice" to={`/session/new/${d.id}`}>
                    <span className="stack" style={{ gap: 2 }}>
                      <strong>{d.name}</strong>
                      <span className="muted">{d.tagline}</span>
                    </span>
                  </Link>
                ))}
          </>
        )}
      </section>
    </main>
  )
}
