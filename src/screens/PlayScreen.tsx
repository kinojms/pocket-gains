import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { content } from '../content'
import { useAppData } from '../data/AppData'
import { addSetLogs, loadActive, logSetsAndSaveActive, saveActive, updateSession } from '../data/repo'
import { lastWeightFor, tutorialMode } from '../domain/history'
import { feedback } from '../feedback/feedback'
import { remainingMs, repRangeFor, restSecFor, step, type ActiveSession, type SessionAction } from '../domain/session'
import { useNow } from '../hooks/useNow'
import { useWakeLock } from '../hooks/useWakeLock'
import { Icon } from '../ui/Icon'
import { EndEarlySheet } from './play/EndEarlySheet'
import { RestView } from './play/RestView'
import { SetView } from './play/SetView'
import { TutorialView } from './play/TutorialView'
import { WarmupView } from './play/WarmupView'

export function PlayScreen() {
  const { db, ready } = useAppData()
  // Read the saved state fresh from IndexedDB: the context copy is only refreshed at start/end,
  // so resuming from it would rewind the workout. Locked for this mount: when the session ends
  // `active` is cleared while we navigate to the summary, which must not bounce us home.
  const [session, setSession] = useState<ActiveSession | null | undefined>(undefined)
  useEffect(() => {
    let cancelled = false
    void loadActive(db).then((a) => {
      if (!cancelled) setSession(a)
    })
    return () => {
      cancelled = true
    }
  }, [db])
  if (!ready || session === undefined) return null
  if (!session) return <Navigate to="/" replace />
  return <Player key={session.sessionId} initial={session} />
}

function Player({ initial }: { initial: ActiveSession }) {
  const { db, history, afterWrite } = useAppData()
  const navigate = useNavigate()
  const [state, setState] = useState<ActiveSession>(initial)
  const stateRef = useRef<ActiveSession>(initial)
  const writes = useRef<Promise<void>>(Promise.resolve())
  const [ending, setEnding] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [weights, setWeights] = useState<Record<string, number>>({})
  const [saveError, setSaveError] = useState(false)
  const now = useNow(250)
  useWakeLock(state.phase !== 'summary')

  const dispatch = useCallback(
    (action: SessionAction) => {
      const cur = stateRef.current
      const { state: next, logs } = step(cur, action, content)
      if (next === cur) return
      stateRef.current = next
      setState(next)
      setShowTutorial(false)
      // Persist in order; a later write never overtakes an earlier one, and one failure never blocks the rest.
      writes.current = writes.current
        .then(async () => {
          if (next.phase === 'summary') {
            try {
              if (logs.length > 0) await addSetLogs(db, next.sessionId, logs)
              await updateSession(db, next.sessionId, {
                status: next.status, endReason: next.endReason, endedAt: new Date().toISOString(),
              })
              await saveActive(db, null)
            } finally {
              await afterWrite().catch(() => undefined)
              navigate(`/session/summary/${next.sessionId}`, { replace: true })
            }
          } else {
            await logSetsAndSaveActive(db, next.sessionId, logs, next)
            setSaveError(false)
          }
        })
        .catch((e: unknown) => {
          console.error('could not save workout step', e)
          setSaveError(true)
        })
    },
    [db, afterWrite, navigate],
  )

  // Wall-clock rest: fires as soon as the app is visible again after the rest ran out.
  const restOver = state.phase === 'rest' && remainingMs(state.restEndsAt, now) === 0
  useEffect(() => {
    if (!restOver) return
    feedback('restDone')
    dispatch({ type: 'REST_DONE' })
  }, [restOver, dispatch])

  const deck = content.decks.find((d) => d.id === state.deckId)
  const card = state.hand[state.cardIndex]
  const ex = card ? content.exercises[card.exerciseId] : undefined

  let view: ReactNode = null
  if (state.phase === 'summary') {
    view = <p className="muted">Saving…</p>
  } else if (state.phase === 'warmup') {
    view = (
      <WarmupView
        exercise={content.exercises[state.warmupId]}
        remaining={remainingMs(state.warmupEndsAt, now)}
        totalMs={(content.exercises[state.warmupId].durationSec ?? 180) * 1000}
        onDone={() => dispatch({ type: 'WARMUP_DONE' })}
      />
    )
  } else if (ex && (state.phase === 'tutorial' || showTutorial)) {
    const mode = showTutorial ? 'full' : tutorialMode(ex.id, history)
    const label = showTutorial ? 'Back to my set' : mode === 'full' ? "I'm ready. Start set 1" : 'Skip, start set 1'
    view = (
      <TutorialView
        key={`${ex.id}-${mode}`}
        exercise={ex} settings={state.settings} mode={mode} readyLabel={label}
        onReady={() => (showTutorial ? setShowTutorial(false) : dispatch({ type: 'READY' }))}
      />
    )
  } else if (ex && state.phase === 'set') {
    const initialWeight = ex.equipment === 'dumbbell' ? (weights[ex.id] ?? lastWeightFor(ex.id, history) ?? 5) : null
    view = (
      <SetView
        key={`${state.cardIndex}-${state.setNo}`}
        exercise={ex} settings={state.settings} setNo={state.setNo}
        initialReps={state.lastReps ?? repRangeFor(ex, state.settings)[0]}
        initialWeight={initialWeight}
        onLog={(reps, weightKg) => {
          if (weightKg !== null) setWeights((w) => ({ ...w, [ex.id]: weightKg }))
          dispatch({ type: 'LOG_SET', reps, weightKg, now: Date.now() })
        }}
        onHurt={(reps, weightKg) => dispatch({ type: 'HURT', reps, weightKg })}
        onShowTutorial={() => setShowTutorial(true)}
      />
    )
  } else if (ex && state.phase === 'rest') {
    const cardDone = state.setNo > state.settings.sets
    const next = state.hand[state.cardIndex + 1]
    view = (
      <RestView
        exercise={ex}
        remaining={remainingMs(state.restEndsAt, now)}
        totalMs={restSecFor(ex, state.settings) * 1000}
        lastReps={state.lastReps}
        range={repRangeFor(ex, state.settings)}
        nextLabel={cardDone && next ? `Next card: ${content.exercises[next.exerciseId].name}` : `Next: set ${state.setNo} / ${state.settings.sets}`}
        onAdd={() => dispatch({ type: 'ADD_REST', ms: 15_000 })}
        onSkip={() => dispatch({ type: 'REST_DONE' })}
      />
    )
  }

  const focus = state.phase === 'warmup' || !ex ? 0 : ex.rarity
  return (
    <main className="screen full focus" data-focus={focus}>
      <div className="topbar">
        <span className="label">
          {deck?.name}
          {state.phase !== 'warmup' && state.phase !== 'summary' && ` · Card ${state.cardIndex + 1} / ${state.hand.length}`}
        </span>
        {state.phase !== 'summary' && (
          <button className="btn round" aria-label="End session" onClick={() => setEnding(true)}><Icon name="close" /></button>
        )}
      </div>
      {saveError && (
        <p role="alert" className="panel">
          Couldn't save the last step on this phone. Keep going: the next step saves again.
        </p>
      )}
      {view}
      {ending && (
        <EndEarlySheet
          onCancel={() => setEnding(false)}
          onConfirm={(reason) => {
            setEnding(false)
            dispatch({ type: 'END_EARLY', reason })
          }}
        />
      )}
    </main>
  )
}
