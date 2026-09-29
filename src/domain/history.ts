import { finishedSessions } from './defaults'
import type { EndReason, History, SessionRecord } from './types'

export const TUTORIAL_COMFORT_SESSIONS = 3

function countedSessions(history: History): SessionRecord[] {
  return finishedSessions(history).filter((s) => s.status !== 'abandoned')
}

export function tutorialMode(exerciseId: string, history: History): 'full' | 'refresher' {
  const finished = new Set(countedSessions(history).map((s) => s.id))
  const sessionsWithExercise = new Set(
    history.sets
      .filter((s) => s.exerciseId === exerciseId && s.reps > 0 && !s.stoppedForPain && finished.has(s.sessionId))
      .map((s) => s.sessionId),
  )
  return sessionsWithExercise.size >= TUTORIAL_COMFORT_SESSIONS ? 'refresher' : 'full'
}

export function lastWeightFor(exerciseId: string, history: History): number | null {
  const weighted = history.sets.filter((s) => s.exerciseId === exerciseId && s.weightKg !== null)
  if (weighted.length === 0) return null
  return weighted.reduce((a, b) => (a.loggedAt >= b.loggedAt ? a : b)).weightKg
}

export interface EndEarlySuggestion {
  reason: EndReason
  message: string
}

const SUGGESTIONS: Record<Exclude<EndReason, 'other'>, string> = {
  no_time: 'Short on time lately? Try 3 cards per session in setup. A short session still counts.',
  too_hard: 'These sessions have felt too hard. For the next week, try 2 sets and stop 3–4 reps before failure.',
  tired: "Feeling tired a lot? Try training earlier in the day, and aim for 7+ hours of sleep.",
}

export function endEarlySuggestion(history: History): EndEarlySuggestion | null {
  const last3 = countedSessions(history).slice(0, 3)
  if (last3.length < 3) return null
  const reason = last3[0].endReason
  if (reason === null || reason === 'other') return null
  if (!last3.every((s) => s.status === 'partial' && s.endReason === reason)) return null
  return { reason, message: SUGGESTIONS[reason] }
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function trainedToday(history: History, now: Date): boolean {
  return countedSessions(history).some((s) => sameLocalDay(new Date(s.startedAt), now))
}

export function recentSessions(history: History, n: number): SessionRecord[] {
  return countedSessions(history).slice(0, n)
}
