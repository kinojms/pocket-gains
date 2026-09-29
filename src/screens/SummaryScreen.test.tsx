import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { addSetLogs, createSession, loadHistory, saveProfile } from '../data/repo'
import { makeProfile, makeSession } from '../domain/testFixtures'
import { makeTestDb, renderRoutes } from '../test/renderApp'
import { SummaryScreen } from './SummaryScreen'

const routes = [
  { path: '/session/summary/:sessionId', element: <SummaryScreen /> },
  { path: '/', element: <p>HOME</p> },
]

async function seed(status: 'complete' | 'partial', experience: 'new' | 'consistent') {
  return makeTestDb(async (d) => {
    await saveProfile(d, makeProfile({ experience, onboardedAt: new Date().toISOString() }))
    await createSession(d, makeSession({
      id: 's1', startedAt: new Date().toISOString(), status, endReason: status === 'partial' ? 'tired' : null,
    }))
    await addSetLogs(d, 's1', [
      { exerciseId: 'pushup', setNo: 1, reps: 10, weightKg: null, stoppedForPain: false },
      { exerciseId: 'pushup', setNo: 2, reps: 9, weightKg: null, stoppedForPain: false },
      { exerciseId: 'crunch', setNo: 1, reps: 3, weightKg: null, stoppedForPain: true },
    ])
  })
}

describe('SummaryScreen', () => {
  it('shows XP from completed sets plus the completion bonus, and marks pain stops', async () => {
    const db = await seed('complete', 'consistent')
    renderRoutes(db, routes, ['/session/summary/s1'])
    expect(await screen.findByRole('heading', { name: 'Hand cleared!' })).toBeInTheDocument()
    expect(screen.getByText('+45 XP')).toBeInTheDocument()
    expect(screen.getByText(/2 sets completed/)).toBeInTheDocument()
    expect(screen.getByText(/stopped: hurt/)).toBeInTheDocument()
    expect(screen.queryByText(/How sore/)).toBeNull()
  })

  it('treats a partial session kindly and asks for soreness during the on-ramp', async () => {
    const db = await seed('partial', 'new')
    const user = userEvent.setup()
    renderRoutes(db, routes, ['/session/summary/s1'])
    expect(await screen.findByRole('heading', { name: 'Session saved' })).toBeInTheDocument()
    expect(screen.getByText('+20 XP')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Very sore/ }))
    await waitFor(async () => expect((await loadHistory(db)).soreness[0]).toMatchObject({ sessionId: 's1', rating: 3 }))
    expect(await screen.findByText(/hold this week's settings/)).toBeInTheDocument()
  })
})
