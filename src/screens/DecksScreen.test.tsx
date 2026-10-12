import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { saveProfile } from '../data/repo'
import { makeProfile } from '../domain/testFixtures'
import { makeTestDb, renderRoutes } from '../test/renderApp'
import { DecksScreen } from './DecksScreen'

describe('DecksScreen', () => {
  it('shows every deck with its cards, evolution line and equipment locks', async () => {
    const db = await makeTestDb((d) => saveProfile(d, makeProfile({ equipment: ['bodyweight'] })))
    renderRoutes(db, [{ path: '/decks', element: <DecksScreen /> }], ['/decks'])
    const push = await screen.findByRole('region', { name: 'Upper Body: Push' })
    expect(within(push).queryByRole('article', { name: 'Push-up' })).toBeNull() // collapsed: only the fan preview (hidden from AT)
    await userEvent.setup().click(within(push).getByRole('button', { name: /See all/ }))
    expect(within(push).getByRole('link', { name: /Train/ })).toHaveAttribute('href', '/session/new/push')
    const pushupCard = within(push).getByRole('article', { name: 'Push-up' })
    expect(within(pushupCard).getByText(/Evolves →/)).toHaveTextContent('Decline Push-up')
    expect(within(within(push).getByRole('article', { name: 'Dumbbell Floor Press' })).getByText('Needs dumbbells')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Lower Body + Core' })).toBeInTheDocument()
  })
})
