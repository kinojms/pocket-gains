import { describe, expect, it } from 'vitest'
import { content } from '../content'
import { coverageWarnings, planFor, plannedDeckId, recommendedDays, REST_WEEK, trainingDays, type PlanSnapshot } from './plan'
import { makeHistory, makeProfile } from './testFixtures'

const snap = (o: Partial<PlanSnapshot>): PlanSnapshot => ({
  id: crypto.randomUUID(), effectiveFrom: '2026-01-12', savedAt: '2026-01-12T10:00:00.000Z',
  days: { ...REST_WEEK, wed: 'push', sat: 'pull' }, isCustom: true, ...o,
})

describe('recommended plans', () => {
  it('3 days on the on-ramp, 4 at target, using real deck ids', () => {
    expect(trainingDays(recommendedDays(3))).toEqual(['mon', 'wed', 'fri'])
    expect(recommendedDays(4)).toMatchObject({ mon: 'push', tue: 'lower', thu: 'pull', sat: 'lower' })
    const ids = new Set(content.decks.map((d) => d.id))
    for (const n of [3, 4]) for (const id of Object.values(recommendedDays(n))) if (id) expect(ids.has(id)).toBe(true)
  })
})

describe('planFor', () => {
  const ctx = (plans: PlanSnapshot[] = [], experience: 'new' | 'consistent' = 'consistent') => ({
    profile: makeProfile({ experience }), history: makeHistory(), plans,
  })

  it('follows the on-ramp: 3 days for a new user in week 1, 4 days at target', () => {
    expect(trainingDays(planFor(new Date(2026, 0, 6), ctx([], 'new')).days)).toHaveLength(3)
    expect(trainingDays(planFor(new Date(2026, 0, 6), ctx()).days)).toHaveLength(4)
  })

  it('a custom plan applies from its date; earlier days keep the plan in effect then', () => {
    const c = ctx([snap({})])
    expect(plannedDeckId(new Date(2026, 0, 5), c)).toBe('push') // Mon before the change: recommended
    expect(plannedDeckId(new Date(2026, 0, 12), c)).toBeNull() // Mon after: custom rest
    expect(plannedDeckId(new Date(2026, 0, 14), c)).toBe('push') // Wed after: custom
    expect(planFor(new Date(2026, 0, 14), c).isCustom).toBe(true)
  })

  it('"use recommended" reverts from its own date, and the latest save on a day wins', () => {
    const c = ctx([
      snap({}),
      snap({ effectiveFrom: '2026-01-19', savedAt: '2026-01-19T08:00:00.000Z', days: { ...REST_WEEK, fri: 'lower' } }),
      snap({ effectiveFrom: '2026-01-19', savedAt: '2026-01-19T09:00:00.000Z', isCustom: false }),
    ])
    expect(plannedDeckId(new Date(2026, 0, 14), c)).toBe('push')
    expect(planFor(new Date(2026, 0, 19), c).isCustom).toBe(false)
    expect(plannedDeckId(new Date(2026, 0, 19), c)).toBe('push')
  })
})

describe('coverageWarnings', () => {
  it('flags missing decks and too few days, and is quiet for the recommended plan', () => {
    expect(coverageWarnings(recommendedDays(4), content.decks)).toEqual([])
    const w = coverageWarnings({ ...REST_WEEK, mon: 'push' }, content.decks)
    expect(w.some((x) => /2\+ days/.test(x))).toBe(true)
    expect(w.some((x) => x.startsWith('Upper Body: Pull + Arms'))).toBe(true)
    expect(coverageWarnings(REST_WEEK, content.decks)[0]).toMatch(/No training days/)
  })
})
