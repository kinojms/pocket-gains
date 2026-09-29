import { hashString } from './rng'
import type { History, SetLog } from './types'

export const XP_PER_SET = 10
export const XP_SESSION_BONUS = 25

export function countsForXp(set: SetLog): boolean {
  return !set.stoppedForPain && set.reps > 0
}

export function sessionXp(history: History, sessionId: string): number {
  const sets = history.sets.filter((s) => s.sessionId === sessionId && countsForXp(s)).length
  const complete = history.sessions.some((s) => s.id === sessionId && s.status === 'complete')
  return sets * XP_PER_SET + (complete ? XP_SESSION_BONUS : 0)
}

export function totalXp(history: History): number {
  const sets = history.sets.filter(countsForXp).length
  const completes = history.sessions.filter((s) => s.status === 'complete').length
  return sets * XP_PER_SET + completes * XP_SESSION_BONUS
}

export function xpToNext(level: number): number {
  return 50 + 25 * (level - 1)
}

export function levelFromXp(xp: number): { level: number; xpIntoLevel: number; xpForNext: number } {
  let level = 1
  let rest = xp
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level)
    level++
  }
  return { level, xpIntoLevel: rest, xpForNext: xpToNext(level) }
}

export type PetMoment = 'home_fresh' | 'home_trained_today' | 'summary_complete' | 'summary_partial' | 'level_up'

const LINES: Record<PetMoment, string[]> = {
  home_fresh: [
    "Ready when you are! Let's deal a hand.",
    "I've been stretching. Your turn! 👀",
    "Just one session today. We've got this.",
    'I saved you a spot on the floor. Let’s go!',
  ],
  home_trained_today: [
    'We trained today! I feel stronger already 💪',
    'Rest up. Muscles grow while we recover.',
    'Great work today. See you next session!',
  ],
  summary_complete: ['Hand cleared! That was awesome!', 'Every rep counts, and you did them all!', 'Look at us go! 💪'],
  summary_partial: [
    'We still showed up today 💪',
    'A short session beats no session. Proud of you!',
    'Showing up is the hard part. We did it.',
  ],
  level_up: ['LEVEL UP! I can feel it in my arms!', "New level! We're getting stronger together!"],
}

export function petLine(moment: PetMoment, seed: string): string {
  const lines = LINES[moment]
  return lines[hashString(seed) % lines.length]
}
