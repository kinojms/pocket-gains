import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addSetLogs, createSession, saveProfile } from '../data/repo'
import { makeProfile, makeSession } from '../domain/testFixtures'
import { makeTestDb, renderRoutes } from '../test/renderApp'
import { ExerciseHistoryScreen } from './ExerciseHistoryScreen'

describe('ExerciseHistoryScreen', () => {
  it('lists each session with its sets and charts the best weight over time', async () => {
    const db = await makeTestDb(async (d) => {
      await saveProfile(d, makeProfile())
      await createSession(d, makeSession({ id: 'a', startedAt: '2026-01-05T09:00:00.000Z' }))
      await createSession(d, makeSession({ id: 'b', startedAt: '2026-01-08T09:00:00.000Z' }))
      await addSetLogs(d, 'a', [{ exerciseId: 'db-curl', setNo: 1, reps: 10, weightKg: 8, stoppedForPain: false }])
      await addSetLogs(d, 'b', [
        { exerciseId: 'db-curl', setNo: 1, reps: 9, weightKg: 10, stoppedForPain: false },
        { exerciseId: 'db-curl', setNo: 2, reps: 8, weightKg: 10, stoppedForPain: false },
      ])
    })
    renderRoutes(db, [{ path: '/progress/exercise/:exerciseId', element: <ExerciseHistoryScreen /> }], ['/progress/exercise/db-curl'])
    expect(await screen.findByRole('heading', { name: 'Dumbbell Biceps Curl' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Best weight: 8 kg → 10 kg' })).toBeInTheDocument()
    expect(screen.getByText('9×10 kg · 8×10 kg')).toBeInTheDocument()
    expect(screen.getByText('10×8 kg')).toBeInTheDocument()
  })
})
