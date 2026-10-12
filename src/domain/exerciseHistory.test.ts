import { describe, expect, it } from 'vitest'
import { bestSeries, exerciseHistory, trainedExercises } from './exerciseHistory'
import { makeHistory, makeSession, makeSet } from './testFixtures'

const h = makeHistory({
  sessions: [
    makeSession({ id: 'a', startedAt: '2026-01-05T09:00:00.000Z' }),
    makeSession({ id: 'b', startedAt: '2026-01-08T09:00:00.000Z', status: 'partial', endReason: 'tired' }),
    makeSession({ id: 'c', startedAt: '2026-01-09T09:00:00.000Z', status: 'abandoned' }),
    makeSession({ id: 'd', startedAt: '2026-01-10T09:00:00.000Z', status: 'in_progress' }),
  ],
  sets: [
    makeSet({ sessionId: 'a', exerciseId: 'db-curl', setNo: 2, reps: 9, weightKg: 8 }),
    makeSet({ sessionId: 'a', exerciseId: 'db-curl', setNo: 1, reps: 10, weightKg: 8 }),
    makeSet({ sessionId: 'b', exerciseId: 'db-curl', setNo: 1, reps: 8, weightKg: 10 }),
    makeSet({ sessionId: 'b', exerciseId: 'db-curl', setNo: 2, reps: 3, weightKg: 10, stoppedForPain: true }),
    makeSet({ sessionId: 'b', exerciseId: 'pushup', setNo: 1, reps: 12 }),
    makeSet({ sessionId: 'c', exerciseId: 'db-curl', setNo: 1, reps: 20, weightKg: 12 }),
    makeSet({ sessionId: 'd', exerciseId: 'db-curl', setNo: 1, reps: 20, weightKg: 12 }),
  ],
})

describe('exerciseHistory', () => {
  it('lists finished sessions newest first with ordered sets and bests, ignoring pain stops', () => {
    expect(exerciseHistory('db-curl', h)).toEqual([
      { sessionId: 'b', startedAt: '2026-01-08T09:00:00.000Z', sets: [{ reps: 8, weightKg: 10 }], bestReps: 8, bestWeight: 10 },
      { sessionId: 'a', startedAt: '2026-01-05T09:00:00.000Z', sets: [{ reps: 10, weightKg: 8 }, { reps: 9, weightKg: 8 }], bestReps: 10, bestWeight: 8 },
    ])
  })

  it('bodyweight exercises have no best weight', () => {
    expect(exerciseHistory('pushup', h)[0].bestWeight).toBeNull()
  })
})

describe('trainedExercises', () => {
  it('summarizes each trained exercise, most recent first', () => {
    expect(trainedExercises(h)).toEqual([
      { exerciseId: 'db-curl', sessions: 2, lastAt: '2026-01-08T09:00:00.000Z' },
      { exerciseId: 'pushup', sessions: 1, lastAt: '2026-01-08T09:00:00.000Z' },
    ])
  })
})

describe('bestSeries', () => {
  it('charts best weight when every session has one, else best reps, oldest first', () => {
    const history = makeHistory({
      sessions: [
        makeSession({ id: 'a', startedAt: '2026-01-05T09:00:00.000Z' }),
        makeSession({ id: 'b', startedAt: '2026-01-07T09:00:00.000Z' }),
      ],
      sets: [
        makeSet({ sessionId: 'a', exerciseId: 'db-curl', reps: 10, weightKg: 8 }),
        makeSet({ sessionId: 'b', exerciseId: 'db-curl', reps: 9, weightKg: 10 }),
        makeSet({ sessionId: 'a', exerciseId: 'pushup', reps: 8, weightKg: null }),
        makeSet({ sessionId: 'b', exerciseId: 'pushup', reps: 11, weightKg: null }),
      ],
    })
    expect(bestSeries('db-curl', history)).toEqual({ values: [8, 10], byWeight: true })
    expect(bestSeries('pushup', history)).toEqual({ values: [8, 11], byWeight: false })
    expect(bestSeries('squat', history)).toEqual({ values: [], byWeight: false })
  })
})
