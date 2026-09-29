import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { loadActive, loadHistory, saveProfile } from '../data/repo'
import { makeProfile } from '../domain/testFixtures'
import { makeTestDb, renderRoutes } from '../test/renderApp'
import { NewSessionScreen } from './NewSessionScreen'

const routes = [
  { path: '/session/new/:deckId', element: <NewSessionScreen /> },
  { path: '/session/play', element: <p>PLAY</p> },
  { path: '/', element: <p>HOME</p> },
]

// onboarded long ago + consistent -> target defaults
const profile = makeProfile({ experience: 'consistent', onboardedAt: '2025-01-01T00:00:00.000Z' })

describe('NewSessionScreen', () => {
  it('pre-fills recommended settings with sources, deals a hand, allows 2 swaps, and starts', async () => {
    const db = await makeTestDb((d) => saveProfile(d, profile))
    const user = userEvent.setup()
    renderRoutes(db, routes, ['/session/new/push'])

    expect(await screen.findByRole('status', { name: 'Sets' })).toHaveTextContent('3')
    expect(screen.getByRole('status', { name: 'Cards' })).toHaveTextContent('5')
    expect(screen.getAllByText(/Why this number/).length).toBeGreaterThanOrEqual(4)

    await user.click(screen.getByRole('button', { name: /Deal my hand/ }))
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(5)

    const firstName = cards[0].getAttribute('aria-label')
    await user.click(within(cards[0]).getByRole('button', { name: /Swap/ }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getAllByRole('button')[0])
    expect(screen.getAllByRole('article')[0].getAttribute('aria-label')).not.toBe(firstName)
    expect(screen.getByText(/1 swap left/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Start/ }))
    await screen.findByText('PLAY')
    await waitFor(async () => {
      const h = await loadHistory(db)
      expect(h.sessions[0]).toMatchObject({ deckId: 'push', status: 'in_progress' })
      expect(h.sessions[0].hand).toHaveLength(5)
      expect((await loadActive(db))?.phase).toBe('warmup')
    })
  })

  it('caps the card count at what the equipment allows', async () => {
    const db = await makeTestDb((d) => saveProfile(d, { ...profile, equipment: ['bodyweight'] }))
    const user = userEvent.setup()
    renderRoutes(db, routes, ['/session/new/pull'])
    await screen.findByRole('status', { name: 'Cards' })
    expect(screen.getByRole('button', { name: 'Increase Cards' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Deal my hand/ }))
    expect(screen.getAllByRole('article')).toHaveLength(5)
  })

  it('redirects home for an unknown deck', async () => {
    const db = await makeTestDb((d) => saveProfile(d, profile))
    renderRoutes(db, routes, ['/session/new/nope'])
    expect(await screen.findByText('HOME')).toBeInTheDocument()
  })
})
