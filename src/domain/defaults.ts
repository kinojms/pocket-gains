import type { SourceKey } from '../content/sources'
import type { Experience, History, Profile, SessionRecord, SessionSettings, SorenessCheckin } from './types'

export type Stage = 'ramp1' | 'ramp2' | 'target'

const WEEK_MS = 7 * 86_400_000

export const STAGE_DEFAULTS: Record<Stage, { sets: number; cards: number; rir: [number, number]; daysPerWeek: number }> = {
  ramp1: { sets: 2, cards: 4, rir: [3, 4], daysPerWeek: 3 },
  ramp2: { sets: 3, cards: 5, rir: [2, 3], daysPerWeek: 3 },
  target: { sets: 3, cards: 5, rir: [1, 3], daysPerWeek: 4 },
}

export const DEFAULT_SOURCES: Record<'sets' | 'reps' | 'effort' | 'rest' | 'cards' | 'days', SourceKey[]> = {
  sets: ['schoenfeld-2017-volume', 'acsm-2009'],
  reps: ['acsm-2009', 'schoenfeld-2017-load'],
  effort: ['helms-2016-rir'],
  rest: ['schoenfeld-2016-rest'],
  cards: ['schoenfeld-2017-volume'],
  days: ['schoenfeld-2016-frequency', 'acsm-2009'],
}

export const ONRAMP_SOURCES: SourceKey[] = ['acsm-2009', 'staron-1991', 'seaborne-2018']

export function weekIndex(onboardedAt: string, at: Date | string): number {
  return Math.floor((new Date(at).getTime() - new Date(onboardedAt).getTime()) / WEEK_MS)
}

/** Weeks since onboarding, minus one week for every earlier week that had a "very sore" check-in. */
export function effectiveWeek(onboardedAt: string, now: Date, soreness: SorenessCheckin[]): number {
  const raw = Math.max(0, weekIndex(onboardedAt, now))
  const held = new Set(
    soreness
      .filter((c) => c.rating === 3)
      .map((c) => weekIndex(onboardedAt, c.createdAt))
      .filter((w) => w >= 0 && w < raw),
  )
  return Math.max(0, raw - held.size)
}

export function stageFor(experience: Experience, week: number): Stage {
  if (experience === 'consistent') return 'target'
  if (week < 2) return 'ramp1'
  if (experience === 'new' && week < 4) return 'ramp2'
  return 'target'
}

export function finishedSessions(history: History): SessionRecord[] {
  return history.sessions
    .filter((s) => s.status !== 'in_progress')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export interface Recommendation {
  stage: Stage
  settings: SessionSettings
  daysPerWeek: number
  adjustedForTooHard: boolean
}

export function recommendDefaults(profile: Profile, history: History, now: Date): Recommendation {
  const stage = stageFor(profile.experience, effectiveWeek(profile.onboardedAt, now, history.soreness))
  const d = STAGE_DEFAULTS[stage]
  const last = finishedSessions(history)[0]
  const tooHard = last?.status === 'partial' && last.endReason === 'too_hard'
  return {
    stage,
    daysPerWeek: d.daysPerWeek,
    adjustedForTooHard: tooHard,
    settings: {
      sets: tooHard ? Math.max(1, d.sets - 1) : d.sets,
      cards: d.cards,
      rir: d.rir,
      restSec: null,
      repRange: null,
    },
  }
}

/** Warm-up (3 min) + ~45 s per set + ~75 s rest. */
export function estimateMinutes(s: Pick<SessionSettings, 'cards' | 'sets'>): number {
  return 3 + s.cards * s.sets * 2
}
