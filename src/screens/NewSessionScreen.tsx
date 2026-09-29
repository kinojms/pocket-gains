import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { createSession, saveActive } from '../data/repo'
import { DEFAULT_SOURCES, ONRAMP_SOURCES, estimateMinutes, recommendDefaults } from '../domain/defaults'
import { MAX_REROLLS, MAX_SWAPS, dealHand, maxCards, swapOptions } from '../domain/recommender'
import { startSession } from '../domain/session'
import { useNow } from '../hooks/useNow'
import type { HandCard, SessionSettings } from '../domain/types'
import { InfoSources } from '../ui/InfoSources'
import { Stepper } from '../ui/Stepper'
import { TcgCard } from '../ui/TcgCard'

const REP_OPTIONS: { label: string; value: [number, number] | null }[] = [
  { label: 'Auto (per exercise)', value: null },
  { label: '5–8 (heavier)', value: [5, 8] },
  { label: '8–12', value: [8, 12] },
  { label: '12–15', value: [12, 15] },
  { label: '15–20 (lighter)', value: [15, 20] },
]
const REST_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Auto (2 min big moves, 60–75 s small)', value: null },
  { label: '60 s', value: 60 },
  { label: '90 s', value: 90 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
]

export function NewSessionScreen() {
  const { deckId } = useParams()
  const { db, ready, profile, history, active, afterWrite } = useAppData()
  const navigate = useNavigate()
  const deck = content.decks.find((d) => d.id === deckId)
  const limit = deck && profile ? maxCards(deck, content, profile.equipment) : 0
  const nowMs = useNow(60_000)
  const rec = useMemo(() => (profile ? recommendDefaults(profile, history, new Date(nowMs)) : null), [profile, history, nowMs])

  const [stage, setStage] = useState<'setup' | 'hand'>('setup')
  const [settings, setSettings] = useState<SessionSettings | null>(null)
  const [sessionId] = useState(() => crypto.randomUUID())
  const [hand, setHand] = useState<HandCard[]>([])
  const [swapsLeft, setSwapsLeft] = useState(MAX_SWAPS)
  const [rerollsLeft, setRerollsLeft] = useState(MAX_REROLLS)
  const [swapping, setSwapping] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)

  if (!ready) return null
  if (!deck || !profile || !rec) return <Navigate to="/" replace />
  if (active && !starting) return <Navigate to="/session/play" replace />

  const s: SessionSettings = settings ?? { ...rec.settings, cards: Math.min(rec.settings.cards, limit) }
  const update = (patch: Partial<SessionSettings>) => setSettings({ ...s, ...patch })
  const args = { deck, content, profile, history }

  function deal(seed: string) {
    setHand(dealHand({ ...args, cards: s.cards, seed }))
    setStage('hand')
  }

  async function start() {
    setStarting(true)
    const now = Date.now()
    await createSession(db, {
      id: sessionId, startedAt: new Date(now).toISOString(), endedAt: null, deckId: deck!.id,
      settings: s, hand, status: 'in_progress', endReason: null,
    })
    await saveActive(db, startSession({
      sessionId, deckId: deck!.id, settings: s, hand, warmupId: deck!.warmupId,
      warmupSec: content.exercises[deck!.warmupId].durationSec ?? 180, now,
    }))
    await afterWrite()
    navigate('/session/play', { replace: true })
  }

  if (stage === 'setup') {
    return (
      <main className="screen full">
        <header className="stack" style={{ gap: 4 }}>
          <span className="label">{rec.stage === 'target' ? 'Full program' : 'On-ramp: easing you in'}</span>
          <h1>{deck.name}</h1>
          <span className="muted">{deck.tagline}</span>
        </header>
        {rec.adjustedForTooHard && (
          <p className="panel">Last session felt too hard, so this one has one fewer set. You can change it below.</p>
        )}
        {rec.stage !== 'target' && (
          <div className="panel stack">
            <span>Starting gently protects your joints and avoids the soreness that makes people quit.</span>
            <InfoSources keys={ONRAMP_SOURCES} />
          </div>
        )}
        <div className="panel stack">
          <Stepper label="Sets" value={s.sets} min={1} max={6} onChange={(sets) => update({ sets })} />
          <InfoSources keys={DEFAULT_SOURCES.sets} />
        </div>
        <div className="panel stack">
          <label className="row spread">
            <span>Reps</span>
            <select
              value={REP_OPTIONS.findIndex((o) => JSON.stringify(o.value) === JSON.stringify(s.repRange))}
              onChange={(e) => update({ repRange: REP_OPTIONS[Number(e.target.value)].value })}
            >
              {REP_OPTIONS.map((o, i) => <option key={o.label} value={i}>{o.label}</option>)}
            </select>
          </label>
          <span className="muted">Stop {s.rir[0]}–{s.rir[1]} reps before you couldn't do another.</span>
          <InfoSources keys={[...DEFAULT_SOURCES.reps, ...DEFAULT_SOURCES.effort]} />
        </div>
        <div className="panel stack">
          <label className="row spread">
            <span>Rest</span>
            <select
              value={REST_OPTIONS.findIndex((o) => o.value === s.restSec)}
              onChange={(e) => update({ restSec: REST_OPTIONS[Number(e.target.value)].value })}
            >
              {REST_OPTIONS.map((o, i) => <option key={o.label} value={i}>{o.label}</option>)}
            </select>
          </label>
          <InfoSources keys={DEFAULT_SOURCES.rest} />
        </div>
        <div className="panel stack">
          <Stepper label="Cards" value={s.cards} min={Math.min(3, limit)} max={limit} onChange={(cards) => update({ cards })} />
          <InfoSources keys={DEFAULT_SOURCES.cards} />
        </div>
        <p className="muted">About {estimateMinutes(s)} minutes including a 3-minute warm-up.</p>
        <button className="btn btn-primary btn-block" onClick={() => deal(sessionId)}>Deal my hand ▶</button>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>Back</button>
      </main>
    )
  }

  const options = swapping === null ? [] : swapOptions({ ...args, hand, index: swapping })
  return (
    <main className="screen full">
      <header className="row spread">
        <h1>Your hand</h1>
        <span className="muted">{swapsLeft} swap{swapsLeft === 1 ? '' : 's'} left</span>
      </header>
      {hand.map((card, i) => {
        const canSwap = swapsLeft > 0 && swapOptions({ ...args, hand, index: i }).length > 0
        return (
          <TcgCard key={card.chainId} exercise={content.exercises[card.exerciseId]} settings={s}>
            <button className="btn" disabled={!canSwap} onClick={() => setSwapping(i)}>⇄ Swap</button>
          </TcgCard>
        )
      })}
      <button
        className="btn btn-ghost" disabled={rerollsLeft === 0}
        onClick={() => { setRerollsLeft((n) => n - 1); deal(`${sessionId}:reroll`) }}
      >
        🎲 Reroll whole hand ({rerollsLeft} left)
      </button>
      <button className="btn btn-primary btn-block" disabled={hand.length === 0 || starting} onClick={() => void start()}>
        Start ▶
      </button>
      <button className="btn btn-ghost" onClick={() => setStage('setup')}>Back to setup</button>

      {swapping !== null && (
        <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Swap card">
          <div className="sheet">
            <h2>Swap for…</h2>
            {options.map((o) => (
              <button
                key={o.chainId} className="btn"
                onClick={() => {
                  setHand((h) => h.map((c, i) => (i === swapping ? o : c)))
                  setSwapsLeft((n) => n - 1)
                  setSwapping(null)
                }}
              >
                {content.exercises[o.exerciseId].name}
              </button>
            ))}
            <button className="btn btn-ghost" onClick={() => setSwapping(null)}>Cancel</button>
          </div>
        </div>
      )}
    </main>
  )
}
