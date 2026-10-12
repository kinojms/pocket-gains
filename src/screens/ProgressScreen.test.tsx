import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addSetLogs, createSession, saveProfile } from '../data/repo'
import { makeProfile, makeSession } from '../domain/testFixtures'
import { makeTestDb, renderRoutes } from '../test/renderApp'
import { ProgressScreen, syncStatusText } from './ProgressScreen'

describe('syncStatusText', () => {
  it('asks to sign in again when cloud sync has no live session', () => {
    expect(syncStatusText('cloud', 3, true)).toBe('● Not syncing: sign in again to back up your training')
  })

  it('describes local mode, pending changes and synced state', () => {
    expect(syncStatusText('local', 3)).toMatch(/stays on this device/)
    expect(syncStatusText('cloud', 1)).toBe('● Not synced yet (1 change)')
    expect(syncStatusText('cloud', 4)).toBe('● Not synced yet (4 changes)')
    expect(syncStatusText('cloud', 0)).toBe('✓ All changes synced')
  })
})

describe('ProgressScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 0, 11, 20))
  })
  afterEach(() => vi.useRealTimers())

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

  it('shows streak stats, a calendar with trained days, and links to exercise history', async () => {
    const db = await makeTestDb(async (d) => {
      await saveProfile(d, makeProfile({ experience: 'consistent', onboardedAt: new Date(2026, 0, 5, 8).toISOString() }))
      await createSession(d, makeSession({
        id: 'm', startedAt: new Date(2026, 0, 5, 12).toISOString(),
        settings: { sets: 1, cards: 1, rir: [1, 3], restSec: null, repRange: null },
      }))
      await addSetLogs(d, 'm', [{ exerciseId: 'pushup', setNo: 1, reps: 11, weightKg: null, stoppedForPain: false }])
    })
    renderRoutes(db, [{ path: '/progress', element: <ProgressScreen /> }], ['/progress'])
    expect(await screen.findByLabelText('Current streak: 0 days')).toBeInTheDocument()
    expect(screen.getByLabelText('Best streak: 1 day')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'January 2026' })).toBeInTheDocument()
    expect(screen.getByLabelText('January 5: trained')).toBeInTheDocument()
    expect(screen.getByLabelText('January 6: covered by shield')).toBeInTheDocument()
    expect(screen.getByLabelText('January 8: missed')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Push-up/ })).toHaveAttribute('href', '/progress/exercise/pushup')
  })
})
