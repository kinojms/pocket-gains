import { describe, expect, it } from 'vitest'
import { levelFromXp, petLine, sessionXp, totalXp, xpToNext } from './pet'
import { makeHistory, makeSession, makeSet } from './testFixtures'

describe('pet XP', () => {
  it('10 XP per completed set, +25 for a complete session', () => {
    const h = makeHistory({
      sessions: [makeSession({ id: 's1', status: 'complete' })],
      sets: [makeSet({ sessionId: 's1' }), makeSet({ sessionId: 's1' })],
    })
    expect(sessionXp(h, 's1')).toBe(45)
    expect(totalXp(h)).toBe(45)
  })

  it('partial sessions keep set XP but get no bonus', () => {
    const h = makeHistory({
      sessions: [makeSession({ id: 's1', status: 'partial', endReason: 'tired' })],
      sets: [makeSet({ sessionId: 's1' })],
    })
    expect(sessionXp(h, 's1')).toBe(10)
  })

  it('pain-stopped and zero-rep sets earn nothing', () => {
    const h = makeHistory({
      sessions: [makeSession({ id: 's1', status: 'partial', endReason: 'other' })],
      sets: [makeSet({ sessionId: 's1', stoppedForPain: true, reps: 5 }), makeSet({ sessionId: 's1', reps: 0 })],
    })
    expect(totalXp(h)).toBe(0)
  })
})

describe('levels', () => {
  it('level 1 -> 2 costs 50, and each level costs 25 more', () => {
    expect(xpToNext(1)).toBe(50)
    expect(xpToNext(2)).toBe(75)
    expect(levelFromXp(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNext: 50 })
    expect(levelFromXp(49)).toEqual({ level: 1, xpIntoLevel: 49, xpForNext: 50 })
    expect(levelFromXp(50)).toEqual({ level: 2, xpIntoLevel: 0, xpForNext: 75 })
    expect(levelFromXp(130)).toEqual({ level: 3, xpIntoLevel: 5, xpForNext: 100 })
  })

  it('a first ramp1 session (4 cards x 2 sets) reaches level 2', () => {
    expect(levelFromXp(8 * 10 + 25).level).toBe(2)
  })
})

describe('petLine', () => {
  it('is deterministic for a seed and never empty', () => {
    expect(petLine('summary_partial', 'abc')).toBe(petLine('summary_partial', 'abc'))
    expect(petLine('home_fresh', 'x').length).toBeGreaterThan(0)
  })
})
