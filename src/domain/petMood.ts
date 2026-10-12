import { addDays, dateKey } from './dates'
import type { DayPhase } from './dayPhase'
import type { DayInfo } from './streak'

export type PetMood = 'happy' | 'excited' | 'proud' | 'relaxed' | 'sleepy' | 'missed'

export interface MoodInput {
  phase: DayPhase
  plannedToday: boolean
  trainedToday: boolean
  missedYesterday: boolean
}

/** Never sad or guilt-tripping: a missed day only makes the pet hopeful. */
export function petMood(i: MoodInput): PetMood {
  if (i.trainedToday) return 'proud'
  if (i.phase === 'night') return 'sleepy'
  if (i.missedYesterday) return 'missed'
  if (i.plannedToday) return 'excited'
  return 'relaxed'
}

/** Yesterday was a training day without a counted session (a shield covering it still counts as missed). */
export function missedYesterday(days: Map<string, DayInfo>, today: Date): boolean {
  const status = days.get(dateKey(addDays(today, -1)))?.status
  return status === 'missed' || status === 'shielded'
}
