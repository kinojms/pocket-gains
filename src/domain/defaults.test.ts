import { describe, expect, it } from 'vitest'
import { effectiveWeek, estimateMinutes, recommendDefaults, stageFor } from './defaults'
import { T0, daysAfter, makeHistory, makeProfile, makeSession } from './testFixtures'

describe('stageFor', () => {
  it('new: ramp1 for weeks 0-1, ramp2 for weeks 2-3, then target', () => {
    expect(stageFor('new', 0)).toBe('ramp1')
    expect(stageFor('new', 1)).toBe('ramp1')
    expect(stageFor('new', 2)).toBe('ramp2')
    expect(stageFor('new', 3)).toBe('ramp2')
    expect(stageFor('new', 4)).toBe('target')
  })
  it('returning: ramp1 for weeks 0-1, then target', () => {
    expect(stageFor('returning', 1)).toBe('ramp1')
    expect(stageFor('returning', 2)).toBe('target')
  })
  it('consistent: always target', () => {
    expect(stageFor('consistent', 0)).toBe('target')
  })
})

describe('effectiveWeek', () => {
  it('counts whole weeks since onboarding', () => {
    expect(effectiveWeek(T0, daysAfter(T0, 0), [])).toBe(0)
    expect(effectiveWeek(T0, daysAfter(T0, 6.9), [])).toBe(0)
    expect(effectiveWeek(T0, daysAfter(T0, 7), [])).toBe(1)
    expect(effectiveWeek(T0, daysAfter(T0, 15), [])).toBe(2)
  })
  it('a very-sore check-in holds the stage for one extra week', () => {
    const sore = [{ id: 'c1', sessionId: 's1', rating: 3 as const, createdAt: daysAfter(T0, 3).toISOString() }]
    expect(effectiveWeek(T0, daysAfter(T0, 15), sore)).toBe(1)
  })
  it('mild soreness and multiple check-ins in the same week hold at most one week', () => {
    const checks = [
      { id: 'a', sessionId: 's1', rating: 2 as const, createdAt: daysAfter(T0, 1).toISOString() },
      { id: 'b', sessionId: 's2', rating: 3 as const, createdAt: daysAfter(T0, 2).toISOString() },
      { id: 'c', sessionId: 's3', rating: 3 as const, createdAt: daysAfter(T0, 4).toISOString() },
    ]
    expect(effectiveWeek(T0, daysAfter(T0, 15), checks)).toBe(1)
  })
  it('a check-in in the current week does not hold yet', () => {
    const sore = [{ id: 'c1', sessionId: 's1', rating: 3 as const, createdAt: daysAfter(T0, 15).toISOString() }]
    expect(effectiveWeek(T0, daysAfter(T0, 16), sore)).toBe(2)
  })
  it('never goes below zero (clock before onboarding)', () => {
    expect(effectiveWeek(T0, daysAfter(T0, -3), [])).toBe(0)
  })
})

describe('recommendDefaults', () => {
  it('new user on day 1 gets the gentlest on-ramp', () => {
    const r = recommendDefaults(makeProfile({ experience: 'new' }), makeHistory(), daysAfter(T0, 1))
    expect(r.stage).toBe('ramp1')
    expect(r.settings).toEqual({ sets: 2, cards: 4, rir: [3, 4], restSec: null, repRange: null })
    expect(r.daysPerWeek).toBe(3)
  })
  it('new user in week 3 gets ramp2', () => {
    const r = recommendDefaults(makeProfile({ experience: 'new' }), makeHistory(), daysAfter(T0, 15))
    expect(r.settings).toMatchObject({ sets: 3, cards: 5, rir: [2, 3] })
  })
  it('returning user in week 3 gets target defaults', () => {
    const r = recommendDefaults(makeProfile({ experience: 'returning' }), makeHistory(), daysAfter(T0, 15))
    expect(r.stage).toBe('target')
    expect(r.settings).toMatchObject({ sets: 3, cards: 5, rir: [1, 3] })
    expect(r.daysPerWeek).toBe(4)
  })
  it('last session ended early as too hard -> one fewer set, never below 1', () => {
    const h = makeHistory({ sessions: [makeSession({ status: 'partial', endReason: 'too_hard' })] })
    const r = recommendDefaults(makeProfile({ experience: 'new' }), h, daysAfter(T0, 1))
    expect(r.settings.sets).toBe(1)
    expect(r.adjustedForTooHard).toBe(true)
  })
  it('only the most recent finished session matters for too-hard', () => {
    const h = makeHistory({
      sessions: [
        makeSession({ id: 'old', startedAt: '2026-01-05T09:00:00.000Z', status: 'partial', endReason: 'too_hard' }),
        makeSession({ id: 'new', startedAt: '2026-01-07T09:00:00.000Z', status: 'complete' }),
        makeSession({ id: 'live', startedAt: '2026-01-08T09:00:00.000Z', status: 'in_progress' }),
      ],
    })
    const r = recommendDefaults(makeProfile({ experience: 'consistent' }), h, daysAfter(T0, 4))
    expect(r.adjustedForTooHard).toBe(false)
    expect(r.settings.sets).toBe(3)
  })
})

describe('estimateMinutes', () => {
  it('is warm-up plus about 2 minutes per set', () => {
    expect(estimateMinutes({ cards: 4, sets: 2 })).toBe(19)
    expect(estimateMinutes({ cards: 5, sets: 3 })).toBe(33)
  })
})
