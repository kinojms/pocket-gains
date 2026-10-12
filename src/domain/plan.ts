import { WEEKDAYS, dateKey, weekdayOf, type Weekday } from './dates'
import { recommendDefaults } from './defaults'
import type { Deck, History, Profile } from './types'

export type PlanDays = Record<Weekday, string | null>

export interface PlanSnapshot {
  id: string
  /** local dateKey the plan applies from */
  effectiveFrom: string
  savedAt: string
  days: PlanDays
  /** false = "use the recommended plan from effectiveFrom" (days are ignored) */
  isCustom: boolean
}

export const REST_WEEK: PlanDays = { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null }

/** Each muscle ~2×/week at 4 days (Schoenfeld et al., 2016); a gentler 3-day rotation on the on-ramp. */
export function recommendedDays(daysPerWeek: number): PlanDays {
  if (daysPerWeek <= 3) return { ...REST_WEEK, mon: 'push', wed: 'lower', fri: 'pull' }
  return { ...REST_WEEK, mon: 'push', tue: 'lower', thu: 'pull', sat: 'lower' }
}

export interface PlanContext {
  profile: Profile
  history: History
  plans: PlanSnapshot[]
}

export function planFor(date: Date, ctx: PlanContext): { days: PlanDays; isCustom: boolean } {
  const key = dateKey(date)
  const snap = ctx.plans
    .filter((p) => p.effectiveFrom <= key)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.savedAt.localeCompare(a.savedAt))[0]
  if (snap?.isCustom) return { days: snap.days, isCustom: true }
  return { days: recommendedDays(recommendDefaults(ctx.profile, ctx.history, date).daysPerWeek), isCustom: false }
}

export function plannedDeckId(date: Date, ctx: PlanContext): string | null {
  return planFor(date, ctx).days[weekdayOf(date)]
}

export function trainingDays(days: PlanDays): Weekday[] {
  return WEEKDAYS.filter((w) => days[w] !== null)
}

export function coverageWarnings(days: PlanDays, decks: Deck[]): string[] {
  const n = trainingDays(days).length
  if (n === 0) return ['No training days yet. Pick at least 2.']
  const warnings: string[] = []
  if (n < 2) warnings.push('One day a week is a start, but 2+ days trains each muscle often enough to grow.')
  for (const deck of decks) {
    if (!WEEKDAYS.some((w) => days[w] === deck.id)) warnings.push(`${deck.name} isn't in your week, so those muscles won't get trained.`)
  }
  return warnings
}
