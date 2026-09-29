import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createSession, saveActive, saveProfile } from '../data/repo'
import { startSession } from '../domain/session'
import { makeProfile, makeSession } from '../domain/testFixtures'
import { makeTestDb, renderRoutes } from '../test/renderApp'
import { HomeScreen } from './HomeScreen'

const routes = [{ path: '/', element: <HomeScreen /> }]

describe('HomeScreen', () => {
  it('shows the pet, level and a deal button for the suggested deck', async () => {
    const db = await makeTestDb((d) => saveProfile(d, makeProfile({ petName: 'Mochi' })))
    renderRoutes(db, routes, ['/'])
    expect(await screen.findByText(/Mochi · Lv 1/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Your pet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Deal my hand/ })).toHaveAttribute('href', '/session/new/push')
    expect(screen.getByText(/Upper Body: Push/)).toBeInTheDocument()
  })

  it('offers to resume an unfinished session instead of dealing a new one', async () => {
    const db = await makeTestDb(async (d) => {
      await saveProfile(d, makeProfile())
      await createSession(d, makeSession({ id: 's1', status: 'in_progress', endedAt: null }))
      await saveActive(d, startSession({
        sessionId: 's1', deckId: 'push', warmupId: 'warmup-upper', warmupSec: 180, now: Date.now(),
        settings: { sets: 2, cards: 1, rir: [3, 4], restSec: null, repRange: null },
        hand: [{ chainId: 'pushup', exerciseId: 'pushup' }],
      }))
    })
    renderRoutes(db, routes, ['/'])
    expect(await screen.findByRole('link', { name: /Resume session/ })).toHaveAttribute('href', '/session/play')
    expect(screen.queryByRole('link', { name: /Deal my hand/ })).toBeNull()
  })
})
