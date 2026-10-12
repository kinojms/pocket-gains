import { addDays, dateKey, startOfDay, weekKey } from './dates'
import { countsForXp } from './pet'
import { plannedDeckId, type PlanContext } from './plan'
import type { History } from './types'

export type DayStatus = 'done' | 'shielded' | 'missed' | 'rest' | 'bonus' | 'pending'

export interface DayInfo {
  key: string
  status: DayStatus
  deckId: string | null
}

export interface StreakInfo {
  current: number
  best: number
  shieldAvailable: boolean
  days: Map<string, DayInfo>
}

/** Local days with a finished session that completed at least one card (all its sets, no pain stop). */
export function countedDays(history: History): Set<string> {
  const out = new Set<string>()
  for (const s of history.sessions) {
    if (s.status !== 'complete' && s.status !== 'partial') continue
    const perExercise = new Map<string, number>()
    for (const set of history.sets) {
      if (set.sessionId === s.id && countsForXp(set)) perExercise.set(set.exerciseId, (perExercise.get(set.exerciseId) ?? 0) + 1)
    }
    if ([...perExercise.values()].some((n) => n >= s.settings.sets)) out.add(dateKey(new Date(s.startedAt)))
  }
  return out
}

export function streakInfo(ctx: PlanContext, today: Date): StreakInfo {
  const counted = countedDays(ctx.history)
  const todayKey = dateKey(today)
  const shieldWeeks = new Set<string>()
  const days = new Map<string, DayInfo>()
  let current = 0
  let best = 0
  for (let d = startOfDay(new Date(ctx.profile.onboardedAt)); dateKey(d) <= todayKey; d = addDays(d, 1)) {
    const key = dateKey(d)
    const deckId = plannedDeckId(d, ctx)
    const done = counted.has(key)
    let status: DayStatus
    if (deckId === null) status = done ? 'bonus' : 'rest'
    else if (done) {
      status = 'done'
      current++
    } else if (key === todayKey) status = 'pending'
    else if (!shieldWeeks.has(weekKey(d))) {
      shieldWeeks.add(weekKey(d))
      status = 'shielded'
    } else {
      status = 'missed'
      current = 0
    }
    best = Math.max(best, current)
    days.set(key, { key, status, deckId })
  }
  return { current, best, shieldAvailable: !shieldWeeks.has(weekKey(today)), days }
}

/** Streak at `at` without and with one session: a larger `after` means this session extended it. */
export function streakGain(ctx: PlanContext, sessionId: string, at: Date): { before: number; after: number } {
  const without = { ...ctx.history, sessions: ctx.history.sessions.filter((s) => s.id !== sessionId) }
  return { before: streakInfo({ ...ctx, history: without }, at).current, after: streakInfo(ctx, at).current }
}
