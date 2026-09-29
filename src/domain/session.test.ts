import { describe, expect, it } from 'vitest'
import { content } from '../content'
import type { HandCard, SessionSettings, SetLogDraft } from './types'
import { remainingMs, repRangeFor, restSecFor, startSession, step, type ActiveSession, type SessionAction } from './session'

const settings: SessionSettings = { sets: 2, cards: 2, rir: [2, 3], restSec: null, repRange: null }
const hand: HandCard[] = [
  { chainId: 'pushup', exerciseId: 'pushup' },
  { chainId: 'db-lateral-raise', exerciseId: 'db-lateral-raise' },
]

function start(): ActiveSession {
  return startSession({ sessionId: 's1', deckId: 'push', settings, hand, warmupId: 'warmup-upper', warmupSec: 180, now: 1_000 })
}

function run(state: ActiveSession, ...actions: SessionAction[]) {
  const logs: SetLogDraft[] = []
  for (const a of actions) {
    const r = step(state, a, content)
    state = r.state
    logs.push(...r.logs)
  }
  return { state, logs }
}

describe('session state machine', () => {
  it('starts in warm-up with a wall-clock end time and no logs', () => {
    const s = start()
    expect(s.phase).toBe('warmup')
    expect(s.warmupEndsAt).toBe(181_000)
    expect(s.status).toBe('in_progress')
  })

  it('warm-up -> tutorial -> set, producing no set logs (warm-up earns no XP)', () => {
    const { state, logs } = run(start(), { type: 'WARMUP_DONE' }, { type: 'READY' })
    expect(state.phase).toBe('set')
    expect(state.cardIndex).toBe(0)
    expect(logs).toEqual([])
  })

  it('logging a set records it and starts rest using the exercise rest time', () => {
    const { state, logs } = run(start(), { type: 'WARMUP_DONE' }, { type: 'READY' }, { type: 'LOG_SET', reps: 10, weightKg: null, now: 50_000 })
    expect(logs).toEqual([{ exerciseId: 'pushup', setNo: 1, reps: 10, weightKg: null, stoppedForPain: false }])
    expect(state.phase).toBe('rest')
    expect(state.setNo).toBe(2)
    expect(state.lastReps).toBe(10)
    expect(state.restEndsAt).toBe(50_000 + 120_000)
  })

  it('uses the session rest override when set', () => {
    const s = { ...start(), settings: { ...settings, restSec: 60 } }
    const { state } = run(s, { type: 'WARMUP_DONE' }, { type: 'READY' }, { type: 'LOG_SET', reps: 8, weightKg: null, now: 0 })
    expect(state.restEndsAt).toBe(60_000)
  })

  it('ignores a double-tapped LOG_SET (only one set logged)', () => {
    const { logs } = run(
      start(), { type: 'WARMUP_DONE' }, { type: 'READY' },
      { type: 'LOG_SET', reps: 10, weightKg: null, now: 0 },
      { type: 'LOG_SET', reps: 10, weightKg: null, now: 5 },
    )
    expect(logs).toHaveLength(1)
  })

  it('rest done -> next set of the same card', () => {
    const { state } = run(start(), { type: 'WARMUP_DONE' }, { type: 'READY' }, { type: 'LOG_SET', reps: 10, weightKg: null, now: 0 }, { type: 'REST_DONE' })
    expect(state.phase).toBe('set')
    expect(state.setNo).toBe(2)
    expect(state.restEndsAt).toBeNull()
  })

  it('after the last set of a card, rest then move to the next card tutorial', () => {
    const { state } = run(
      start(), { type: 'WARMUP_DONE' }, { type: 'READY' },
      { type: 'LOG_SET', reps: 10, weightKg: null, now: 0 }, { type: 'REST_DONE' },
      { type: 'LOG_SET', reps: 9, weightKg: null, now: 1 },
    )
    expect(state.phase).toBe('rest')
    expect(state.completedCards).toBe(1)
    const next = step(state, { type: 'REST_DONE' }, content).state
    expect(next.phase).toBe('tutorial')
    expect(next.cardIndex).toBe(1)
    expect(next.setNo).toBe(1)
  })

  it('the last set of the last card goes straight to a complete summary', () => {
    const { state, logs } = run(
      start(), { type: 'WARMUP_DONE' }, { type: 'READY' },
      { type: 'LOG_SET', reps: 10, weightKg: null, now: 0 }, { type: 'REST_DONE' },
      { type: 'LOG_SET', reps: 9, weightKg: null, now: 1 }, { type: 'REST_DONE' },
      { type: 'READY' },
      { type: 'LOG_SET', reps: 12, weightKg: 4, now: 2 }, { type: 'REST_DONE' },
      { type: 'LOG_SET', reps: 11, weightKg: 4, now: 3 },
    )
    expect(state.phase).toBe('summary')
    expect(state.status).toBe('complete')
    expect(state.completedCards).toBe(2)
    expect(logs).toHaveLength(4)
    expect(logs[3]).toMatchObject({ exerciseId: 'db-lateral-raise', setNo: 2, weightKg: 4 })
  })

  it('ADD_REST extends the rest end time', () => {
    const { state } = run(start(), { type: 'WARMUP_DONE' }, { type: 'READY' }, { type: 'LOG_SET', reps: 10, weightKg: null, now: 0 }, { type: 'ADD_REST', ms: 15_000 })
    expect(state.restEndsAt).toBe(135_000)
  })

  it('HURT logs a pain-flagged set and skips to the next card', () => {
    const { state, logs } = run(start(), { type: 'WARMUP_DONE' }, { type: 'READY' }, { type: 'HURT', reps: 4, weightKg: null })
    expect(logs).toEqual([{ exerciseId: 'pushup', setNo: 1, reps: 4, weightKg: null, stoppedForPain: true }])
    expect(state.phase).toBe('tutorial')
    expect(state.cardIndex).toBe(1)
    expect(state.stoppedCards).toEqual([0])
  })

  it('HURT on the last card ends the session as complete', () => {
    const s = { ...start(), cardIndex: 1, phase: 'set' as const }
    const { state } = run(s, { type: 'HURT', reps: 0, weightKg: null })
    expect(state.phase).toBe('summary')
    expect(state.status).toBe('complete')
  })

  it('END_EARLY from any phase ends as partial with the reason', () => {
    const { state } = run(start(), { type: 'WARMUP_DONE' }, { type: 'READY' }, { type: 'LOG_SET', reps: 10, weightKg: null, now: 0 }, { type: 'END_EARLY', reason: 'no_time' })
    expect(state.phase).toBe('summary')
    expect(state.status).toBe('partial')
    expect(state.endReason).toBe('no_time')
    expect(state.restEndsAt).toBeNull()
  })

  it('ignores every action once in summary', () => {
    const ended = run(start(), { type: 'END_EARLY', reason: 'tired' }).state
    const { state, logs } = run(ended, { type: 'READY' }, { type: 'LOG_SET', reps: 1, weightKg: null, now: 0 }, { type: 'END_EARLY', reason: 'other' })
    expect(state).toEqual(ended)
    expect(logs).toEqual([])
  })
})

describe('timers', () => {
  it('remainingMs uses wall-clock time, so a locked phone returns the true remainder', () => {
    const endsAt = 1_000 + 120_000
    expect(remainingMs(endsAt, 1_000)).toBe(120_000)
    expect(remainingMs(endsAt, 61_000)).toBe(60_000)
    expect(remainingMs(endsAt, 1_000 + 10 * 60_000)).toBe(0)
    expect(remainingMs(null, 5)).toBe(0)
  })
})

describe('per-exercise settings', () => {
  it('falls back to exercise defaults unless the session overrides them', () => {
    const ex = content.exercises['pushup']
    expect(restSecFor(ex, settings)).toBe(120)
    expect(repRangeFor(ex, settings)).toEqual([8, 15])
    expect(repRangeFor(ex, { ...settings, repRange: [5, 8] })).toEqual([5, 8])
  })
})
