import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSession, saveActive, saveProfile } from '../data/repo'
import { startSession } from '../domain/session'
import { makeProfile, makeSession } from '../domain/testFixtures'
import { makeTestDb, renderRoutes } from '../test/renderApp'
import { HomeScreen } from './HomeScreen'

const routes = [{ path: '/', element: <HomeScreen /> }]

describe('HomeScreen', () => {
  // Home depends on the weekday: pin Date only (timers stay real so Testing Library can wait).
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 5, 10)) // Monday
  })
  afterEach(() => vi.useRealTimers())

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

  it('shows the streak and shield in the header', async () => {
    const db = await makeTestDb((d) => saveProfile(d, makeProfile()))
    renderRoutes(db, routes, ['/'])
    expect(await screen.findByLabelText('0-day streak')).toBeInTheDocument()
    expect(screen.getByText(/Shield ready/)).toBeInTheDocument()
  })

  it('on a rest day, offers the next planned deck instead', async () => {
    vi.setSystemTime(new Date(2026, 9, 7, 10)) // Wednesday: rest in the 4-day plan; Thursday is Pull
    const db = await makeTestDb((d) => saveProfile(d, makeProfile()))
    renderRoutes(db, routes, ['/'])
    expect(await screen.findByText('Rest day')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Train anyway/ })).toHaveAttribute('href', '/session/new/pull')
    expect(screen.queryByRole('link', { name: /Deal my hand/ })).toBeNull()
    expect(screen.getByRole('link', { name: /Edit my week/ })).toHaveAttribute('href', '/plan')
  })
})
