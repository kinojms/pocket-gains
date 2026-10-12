import { describe, expect, it } from 'vitest'
import { dateKey } from './dates'
import { REST_WEEK, type PlanSnapshot } from './plan'
import { countedDays, streakInfo } from './streak'
import { makeHistory, makeProfile, makeSession, makeSet } from './testFixtures'
import type { History } from './types'

// "consistent" user onboarded Mon 2026-01-05 -> recommended 4-day plan: Mon push, Tue lower, Thu pull, Sat lower
const profile = makeProfile({ experience: 'consistent', onboardedAt: new Date(2026, 0, 5, 8).toISOString() })
const day = (d: number) => new Date(2026, 0, d, 12)

function trained(days: number[], o: { sets?: number; setsNeeded?: number; status?: 'complete' | 'partial' } = {}): History {
  const sessions = days.map((d) => makeSession({
    id: `s${d}`, startedAt: day(d).toISOString(), status: o.status ?? 'complete',
    settings: { sets: o.setsNeeded ?? 1, cards: 1, rir: [1, 3], restSec: null, repRange: null },
  }))
  const sets = days.flatMap((d) => Array.from({ length: o.sets ?? 1 }, (_, i) => makeSet({ sessionId: `s${d}`, setNo: i + 1 })))
  return makeHistory({ sessions, sets })
}
const run = (history: History, today: number, plans: PlanSnapshot[] = []) => streakInfo({ profile, history, plans }, day(today))
const status = (info: ReturnType<typeof run>, d: number) => info.days.get(dateKey(day(d)))?.status

describe('countedDays', () => {
  it('needs at least one completed card; warm-up-only or unfinished cards do not count', () => {
    expect(countedDays(trained([5]))).toEqual(new Set(['2026-01-05']))
    expect(countedDays(trained([5], { sets: 1, setsNeeded: 3, status: 'partial' })).size).toBe(0)
    expect(countedDays(makeHistory({ sessions: [makeSession({ id: 'w', startedAt: day(5).toISOString(), status: 'partial' })] })).size).toBe(0)
  })
})

describe('streakInfo', () => {
  it('a brand-new user has no streak and nothing missed', () => {
    const info = run(makeHistory(), 5)
    expect(info).toMatchObject({ current: 0, best: 0, shieldAvailable: true })
    expect(status(info, 5)).toBe('pending')
    expect(info.days.has(dateKey(day(4)))).toBe(false)
  })

  it('counts consecutive scheduled days; rest days are neutral', () => {
    const info = run(trained([5, 6, 8, 10]), 11)
    expect(info.current).toBe(4)
    expect(status(info, 7)).toBe('rest')
  })

  it('one missed scheduled day per week is covered by the shield', () => {
    const info = run(trained([5, 8, 10]), 11)
    expect(info.current).toBe(3)
    expect(status(info, 6)).toBe('shielded')
    expect(info.shieldAvailable).toBe(false)
  })

  it('a second miss in the same week resets the streak', () => {
    const info = run(trained([5, 10]), 11)
    expect(status(info, 6)).toBe('shielded')
    expect(status(info, 8)).toBe('missed')
    expect(info.current).toBe(1)
    expect(info.best).toBe(1)
  })

  it('each week gets a fresh shield', () => {
    const info = run(trained([5, 8, 10, 12, 15, 17]), 18)
    expect(status(info, 6)).toBe('shielded')
    expect(status(info, 13)).toBe('shielded')
    expect(info.current).toBe(6)
  })

  it('today never breaks the streak before it is over', () => {
    const info = run(trained([5]), 6)
    expect(status(info, 6)).toBe('pending')
    expect(info.current).toBe(1)
  })

  it('training on a rest day is a bonus, not a streak day', () => {
    const info = run(trained([5, 7]), 7)
    expect(status(info, 7)).toBe('bonus')
    expect(info.current).toBe(1)
  })

  it('changing the plan later does not rewrite past days', () => {
    const later: PlanSnapshot = {
      id: 'p', effectiveFrom: '2026-01-12', savedAt: '2026-01-12T09:00:00.000Z', days: { ...REST_WEEK, wed: 'push' }, isCustom: true,
    }
    const before = run(trained([5, 6, 8, 10]), 11)
    const after = run(trained([5, 6, 8, 10]), 11, [later])
    expect(after.current).toBe(before.current)
    expect([...after.days.values()]).toEqual([...before.days.values()])
  })
})
