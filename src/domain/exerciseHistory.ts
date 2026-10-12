import { countsForXp } from './pet'
import type { History } from './types'

export interface ExerciseEntry {
  sessionId: string
  startedAt: string
  sets: { reps: number; weightKg: number | null }[]
  bestReps: number
  bestWeight: number | null
}

export interface TrainedExercise {
  exerciseId: string
  sessions: number
  lastAt: string
}

function finished(history: History) {
  return history.sessions
    .filter((s) => s.status === 'complete' || s.status === 'partial')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export function exerciseHistory(exerciseId: string, history: History): ExerciseEntry[] {
  const out: ExerciseEntry[] = []
  for (const s of finished(history)) {
    const sets = history.sets
      .filter((x) => x.sessionId === s.id && x.exerciseId === exerciseId && countsForXp(x))
      .sort((a, b) => a.setNo - b.setNo)
    if (sets.length === 0) continue
    const weights = sets.map((x) => x.weightKg).filter((w): w is number => w !== null)
    out.push({
      sessionId: s.id,
      startedAt: s.startedAt,
      sets: sets.map((x) => ({ reps: x.reps, weightKg: x.weightKg })),
      bestReps: Math.max(...sets.map((x) => x.reps)),
      bestWeight: weights.length > 0 ? Math.max(...weights) : null,
    })
  }
  return out
}

export function trainedExercises(history: History): TrainedExercise[] {
  const byId = new Map<string, TrainedExercise>()
  for (const s of finished(history)) {
    const ids = new Set(history.sets.filter((x) => x.sessionId === s.id && countsForXp(x)).map((x) => x.exerciseId))
    for (const id of ids) {
      const cur = byId.get(id)
      if (cur) cur.sessions++
      else byId.set(id, { exerciseId: id, sessions: 1, lastAt: s.startedAt })
    }
  }
  return [...byId.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}

/** Chart data: best weight per session if every session has one, else best reps; oldest first, last `max` sessions. */
export function bestSeries(exerciseId: string, history: History, max = 12): { values: number[]; byWeight: boolean } {
  const chrono = [...exerciseHistory(exerciseId, history)].reverse().slice(-max)
  const byWeight = chrono.length > 0 && chrono.every((e) => e.bestWeight !== null)
  return { values: chrono.map((e) => (byWeight ? e.bestWeight! : e.bestReps)), byWeight }
}
