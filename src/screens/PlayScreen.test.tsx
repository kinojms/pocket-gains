import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createSession, loadActive, loadHistory, saveActive, saveProfile } from '../data/repo'
import { startSession } from '../domain/session'
import { makeProfile, makeSession } from '../domain/testFixtures'
import { makeTestDb, renderRoutes } from '../test/renderApp'
import { PlayScreen } from './PlayScreen'

const routes = [
  { path: '/session/play', element: <PlayScreen /> },
  { path: '/session/summary/:sessionId', element: <p>SUMMARY</p> },
  { path: '/', element: <p>HOME</p> },
]
const settings = { sets: 2, cards: 2, rir: [2, 3] as [number, number], restSec: 60, repRange: null }
const hand = [
  { chainId: 'pushup', exerciseId: 'pushup' },
  { chainId: 'core-crunch', exerciseId: 'crunch' },
]

async function seeded() {
  return makeTestDb(async (d) => {
    await saveProfile(d, makeProfile())
    await createSession(d, makeSession({ id: 's1', status: 'in_progress', endedAt: null, settings, hand }))
    await saveActive(d, startSession({ sessionId: 's1', deckId: 'push', settings, hand, warmupId: 'warmup-upper', warmupSec: 180, now: Date.now() }))
  })
}

describe('PlayScreen', () => {
  it('runs warm-up -> tutorial -> set -> rest and persists each step', async () => {
    const db = await seeded()
    const user = userEvent.setup()
    renderRoutes(db, routes, ['/session/play'])

    await user.click(await screen.findByRole('button', { name: /Start first card/ }))
    await user.click(screen.getByRole('button', { name: /start set 1/i }))
    await user.click(screen.getByRole('button', { name: /Log set/ }))

    // 1:00, or 1:01 if the 250 ms clock hasn't ticked since the set was logged
    expect(await screen.findByRole('timer', { name: /Rest 1:0[01] remaining/ })).toBeInTheDocument()
    await waitFor(async () => {
      expect((await loadHistory(db)).sets).toHaveLength(1)
      expect((await loadActive(db))?.phase).toBe('rest')
    })

    await user.click(screen.getByRole('button', { name: /Skip rest/ }))
    expect(screen.getByText('Set 2 / 2')).toBeInTheDocument()
  })

  it('ending early saves a partial session and opens the summary', async () => {
    const db = await seeded()
    const user = userEvent.setup()
    renderRoutes(db, routes, ['/session/play'])

    await user.click(await screen.findByRole('button', { name: 'End session' }))
    await user.click(screen.getByRole('button', { name: /No time/ }))
    await screen.findByText('SUMMARY')
    const h = await loadHistory(db)
    expect(h.sessions[0]).toMatchObject({ status: 'partial', endReason: 'no_time' })
    expect(h.sessions[0].endedAt).not.toBeNull()
    expect(await loadActive(db)).toBeNull()
  })

  it('redirects home when there is no active session', async () => {
    const db = await makeTestDb((d) => saveProfile(d, makeProfile()))
    renderRoutes(db, routes, ['/session/play'])
    expect(await screen.findByText('HOME')).toBeInTheDocument()
  })
})

describe('PlayScreen resume', () => {
  it('leaving and resuming in the same app session continues from the saved state, not the start', async () => {
    const db = await seeded()
    const user = userEvent.setup()
    const router = renderRoutes(db, routes, ['/session/play'])
    await user.click(await screen.findByRole('button', { name: /Start first card/ }))
    await user.click(screen.getByRole('button', { name: /start set 1/i }))
    await user.click(screen.getByRole('button', { name: /Log set/ }))
    await screen.findByRole('timer', { name: /Rest/ })
    await waitFor(async () => expect((await loadActive(db))?.phase).toBe('rest'))

    await router.navigate('/')
    await screen.findByText('HOME')
    await router.navigate('/session/play')
    expect(await screen.findByRole('timer', { name: /Rest/ })).toBeInTheDocument()
    expect((await loadHistory(db)).sets).toHaveLength(1)
  })
})
