import { describe, expect, it } from 'vitest'
import { endEarlySuggestion, lastWeightFor, recentSessions, trainedToday, tutorialMode } from './history'
import { makeHistory, makeSession, makeSet } from './testFixtures'

const day = (d: number) => `2026-01-${String(d).padStart(2, '0')}T09:00:00.000Z`

describe('tutorialMode', () => {
  it('stays full until the exercise was done in 3 finished sessions', () => {
    const sessions = [1, 2, 3].map((d) => makeSession({ id: `s${d}`, startedAt: day(d) }))
    const sets = [1, 2].map((d) => makeSet({ sessionId: `s${d}`, exerciseId: 'pushup' }))
    expect(tutorialMode('pushup', makeHistory({ sessions, sets }))).toBe('full')
    const three = [...sets, makeSet({ sessionId: 's3', exerciseId: 'pushup' })]
    expect(tutorialMode('pushup', makeHistory({ sessions, sets: three }))).toBe('refresher')
  })

  it('does not count in-progress sessions, pain-stopped sets or other exercises', () => {
    const sessions = [
      makeSession({ id: 's1', startedAt: day(1) }),
      makeSession({ id: 's2', startedAt: day(2) }),
      makeSession({ id: 's3', startedAt: day(3), status: 'in_progress' }),
    ]
    const sets = [
      makeSet({ sessionId: 's1', exerciseId: 'pushup' }),
      makeSet({ sessionId: 's2', exerciseId: 'pushup', stoppedForPain: true }),
      makeSet({ sessionId: 's3', exerciseId: 'pushup' }),
      makeSet({ sessionId: 's2', exerciseId: 'pushup-decline' }),
    ]
    expect(tutorialMode('pushup', makeHistory({ sessions, sets }))).toBe('full')
  })

  it('a new variation always starts with the full tutorial', () => {
    expect(tutorialMode('pushup-decline', makeHistory())).toBe('full')
  })
})

describe('lastWeightFor', () => {
  it('returns the most recent non-null weight for the exercise', () => {
    const sets = [
      makeSet({ exerciseId: 'db-curl', weightKg: 6, loggedAt: day(1) }),
      makeSet({ exerciseId: 'db-curl', weightKg: 8, loggedAt: day(3) }),
      makeSet({ exerciseId: 'db-curl', weightKg: null, loggedAt: day(4) }),
      makeSet({ exerciseId: 'db-row', weightKg: 12, loggedAt: day(5) }),
    ]
    expect(lastWeightFor('db-curl', makeHistory({ sets }))).toBe(8)
    expect(lastWeightFor('pushup', makeHistory({ sets }))).toBeNull()
  })
})

describe('endEarlySuggestion', () => {
  const partial = (d: number, reason: 'tired' | 'no_time' | 'too_hard' | 'other') =>
    makeSession({ id: `p${d}`, startedAt: day(d), status: 'partial', endReason: reason })

  it('suggests a fix after the same reason 3 sessions in a row', () => {
    const h = makeHistory({ sessions: [partial(1, 'no_time'), partial(2, 'no_time'), partial(3, 'no_time')] })
    expect(endEarlySuggestion(h)?.reason).toBe('no_time')
  })

  it('stays quiet if the streak of reasons is broken by a complete session or a different reason', () => {
    const broken = makeHistory({
      sessions: [partial(1, 'tired'), makeSession({ id: 'c', startedAt: day(2) }), partial(3, 'tired'), partial(4, 'tired')],
    })
    expect(endEarlySuggestion(broken)).toBeNull()
    const mixed = makeHistory({ sessions: [partial(1, 'tired'), partial(2, 'no_time'), partial(3, 'tired')] })
    expect(endEarlySuggestion(mixed)).toBeNull()
  })

  it('never suggests anything for "other"', () => {
    const h = makeHistory({ sessions: [partial(1, 'other'), partial(2, 'other'), partial(3, 'other')] })
    expect(endEarlySuggestion(h)).toBeNull()
  })
})

describe('trainedToday / recentSessions', () => {
  it('detects a finished session on the same local day', () => {
    const now = new Date(2026, 0, 10, 20, 0)
    const morning = new Date(2026, 0, 10, 7, 0).toISOString()
    const yesterday = new Date(2026, 0, 9, 20, 0).toISOString()
    expect(trainedToday(makeHistory({ sessions: [makeSession({ startedAt: morning })] }), now)).toBe(true)
    expect(trainedToday(makeHistory({ sessions: [makeSession({ startedAt: yesterday })] }), now)).toBe(false)
    expect(trainedToday(makeHistory({ sessions: [makeSession({ startedAt: morning, status: 'abandoned' })] }), now)).toBe(false)
  })

  it('lists finished, non-abandoned sessions newest first', () => {
    const h = makeHistory({
      sessions: [
        makeSession({ id: 'a', startedAt: day(1) }),
        makeSession({ id: 'b', startedAt: day(3) }),
        makeSession({ id: 'c', startedAt: day(2), status: 'abandoned' }),
        makeSession({ id: 'd', startedAt: day(4), status: 'in_progress' }),
      ],
    })
    expect(recentSessions(h, 10).map((s) => s.id)).toEqual(['b', 'a'])
  })
})
