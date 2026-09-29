import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addSetLogs, createSession, saveProfile } from '../data/repo'
import { makeProfile, makeSession } from '../domain/testFixtures'
import { makeTestDb, renderRoutes } from '../test/renderApp'
import { ProgressScreen, syncStatusText } from './ProgressScreen'

describe('syncStatusText', () => {
  it('describes local mode, pending changes and synced state', () => {
    expect(syncStatusText('local', 3)).toMatch(/stays on this device/)
    expect(syncStatusText('cloud', 1)).toBe('● Not synced yet (1 change)')
    expect(syncStatusText('cloud', 4)).toBe('● Not synced yet (4 changes)')
    expect(syncStatusText('cloud', 0)).toBe('✓ All changes synced')
  })
})

describe('ProgressScreen', () => {
  it('lists recent sessions with status and set counts', async () => {
    const db = await makeTestDb(async (d) => {
      await saveProfile(d, makeProfile())
      await createSession(d, makeSession({ id: 'a', startedAt: '2026-01-05T09:00:00.000Z', deckId: 'push', status: 'complete' }))
      await createSession(d, makeSession({ id: 'b', startedAt: '2026-01-06T09:00:00.000Z', deckId: 'lower', status: 'partial', endReason: 'tired' }))
      await addSetLogs(d, 'a', [
        { exerciseId: 'pushup', setNo: 1, reps: 10, weightKg: null, stoppedForPain: false },
        { exerciseId: 'pushup', setNo: 2, reps: 9, weightKg: null, stoppedForPain: false },
      ])
    })
    renderRoutes(db, [{ path: '/progress', element: <ProgressScreen /> }], ['/progress'])
    expect(await screen.findByText('Lower Body + Core')).toBeInTheDocument()
    expect(screen.getByText('Partial')).toBeInTheDocument()
    expect(screen.getByText('Complete')).toBeInTheDocument()
    expect(screen.getByText('2 sets')).toBeInTheDocument()
  })
})
