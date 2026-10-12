import { useState } from 'react'
import { Link } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { usePhase } from '../design/phaseContext'
import { estimateMinutes, recommendDefaults } from '../domain/defaults'
import { addDays, dateKey, weekdayOf, WEEKDAY_LABELS } from '../domain/dates'
import { levelFromXp, petLine, totalXp } from '../domain/pet'
import { missedYesterday, petMood } from '../domain/petMood'
import { plannedDeckId } from '../domain/plan'
import { suggestNextDeck } from '../domain/recommender'
import { countedDays, streakInfo } from '../domain/streak'
import type { Deck } from '../domain/types'
import { feedback } from '../feedback/feedback'
import { useNow } from '../hooks/useNow'
import { Icon } from '../ui/Icon'
import { MeadowScene } from '../ui/MeadowScene'
import { Pet } from '../ui/Pet'
import { Pill } from '../ui/Pill'
import { XpBar } from '../ui/XpBar'

export function HomeScreen() {
  const { profile, history, plans, active } = useAppData()
  const [picking, setPicking] = useState(false)
  const [taps, setTaps] = useState(0)
  const phase = usePhase()
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
    : petLine(doneToday ? 'home_trained_today' : todayDeck ? 'home_fresh' : 'home_rest', `${now.toDateString()}:${taps}`)
  const activeDeck = active ? content.decks.find((d) => d.id === active.deckId) : undefined
  const mood = petMood({
    phase, plannedToday: !!todayDeck, trainedToday: doneToday, missedYesterday: missedYesterday(streak.days, now),
  })

  return (
    <main className="screen home">
      <MeadowScene height={340}>
        <div className="row spread">
          <Pill icon="flame" tone="flame" label={`${streak.current}-day streak`}>{streak.current}</Pill>
          <Pill icon="shield" tone="shield">{streak.shieldAvailable ? 'Shield ready' : 'Shield used this week'}</Pill>
        </div>
        <div className="meadow-pet">
          <div className="bubble">{line}</div>
          <Pet size={170} mood={mood} onTap={() => { setTaps((t) => t + 1); feedback('petTap') }} />
        </div>
      </MeadowScene>

      <div className="pet-level">
        <strong className="pet-name">{profile.petName} · Lv {level}</strong>
        <XpBar value={xpIntoLevel} max={xpForNext} label={`${xpIntoLevel} of ${xpForNext} XP to next level`} />
        <span className="muted">{xpIntoLevel} / {xpForNext} XP</span>
      </div>

      <section className="panel stack">
        {active ? (
          <>
            <span className="label">Session in progress</span>
            <h2>{activeDeck?.name}</h2>
            <Link className="btn btn-primary btn-block" to="/session/play">Resume session <Icon name="play" size={18} /></Link>
          </>
        ) : (
          <>
            {todayDeck ? (
              <>
                <span className="label row">
                  {doneToday ? <><Icon name="check" size={16} /> Done for today</> : <><Icon name="calendar" size={16} /> Today · {WEEKDAY_LABELS[weekdayOf(now)]}</>}
                </span>
                <h2>{todayDeck.name}</h2>
                <span className="muted">{rec.settings.cards} cards · ~{estimateMinutes(rec.settings)} min</span>
                <Link className="btn btn-primary btn-block" to={`/session/new/${todayDeck.id}`}>Deal my hand <Icon name="play" size={18} /></Link>
              </>
            ) : (
              <>
                <span className="label row"><Icon name="moon" size={16} /> Rest day</span>
                {next && <h2>Next up: {next.deck.name} on {WEEKDAY_LABELS[weekdayOf(next.date)]}</h2>}
                <Link className="btn btn-block" to={`/session/new/${primary.id}`}>Train anyway <Icon name="play" size={18} /></Link>
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
            <Link className="muted center-text quiet-link" to="/plan">Edit my week</Link>
          </>
        )}
      </section>
    </main>
  )
}
