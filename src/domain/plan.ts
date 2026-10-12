import { WEEKDAYS, dateKey, startOfDay, weekdayOf, type Weekday } from './dates'
import { recommendDefaults } from './defaults'
import type { Deck, Experience, History, Profile } from './types'

export type PlanDays = Record<Weekday, string | null>

export interface PlanSnapshot {
  id: string
  /** local dateKey the plan applies from */
  effectiveFrom: string
  savedAt: string
  days: PlanDays
  /** false = "use the recommended plan from effectiveFrom" (days are ignored) */
  isCustom: boolean
  /** recommended snapshots: the experience the recommendation is based on, so editing it later never rewrites the past */
  experience?: Experience | null
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
  const profile = snap?.experience ? { ...ctx.profile, experience: snap.experience } : ctx.profile
  return { days: recommendedDays(recommendDefaults(profile, ctx.history, date).daysPerWeek), isCustom: false }
}

/**
 * Snapshots to store before the profile's experience changes: they pin the old experience for the past
 * and apply the new one from today. A custom week in effect today is left alone.
 */
export function experienceChange(ctx: PlanContext, next: Experience, now: Date): Omit<PlanSnapshot, 'id'>[] {
  const out: Omit<PlanSnapshot, 'id'>[] = []
  const onboarded = startOfDay(new Date(ctx.profile.onboardedAt))
  const onboardKey = dateKey(onboarded)
  if (!ctx.plans.some((p) => p.effectiveFrom <= onboardKey)) {
    out.push({
      effectiveFrom: onboardKey, savedAt: ctx.profile.onboardedAt, days: REST_WEEK, isCustom: false, experience: ctx.profile.experience,
    })
  }
  if (!planFor(now, ctx).isCustom) {
    out.push({ effectiveFrom: dateKey(now), savedAt: now.toISOString(), days: REST_WEEK, isCustom: false, experience: next })
  }
  return out
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
