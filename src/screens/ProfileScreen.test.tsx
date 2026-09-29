import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { getProfile, saveProfile } from '../data/repo'
import { makeProfile } from '../domain/testFixtures'
import { makeTestDb, renderRoutes } from '../test/renderApp'
import { ProfileScreen } from './ProfileScreen'

describe('ProfileScreen', () => {
  it('edits experience, equipment and pet name without touching the onboarding date', async () => {
    const original = makeProfile({ experience: 'new', equipment: ['bodyweight'] })
    const db = await makeTestDb((d) => saveProfile(d, original))
    const user = userEvent.setup()
    renderRoutes(db, [{ path: '/profile', element: <ProfileScreen /> }], ['/profile'])

    await user.click(await screen.findByRole('button', { name: /Returning after a break/ }))
    await user.click(screen.getByRole('checkbox', { name: /Resistance bands/ }))
    const name = screen.getByRole('textbox', { name: /Pet name/ })
    await user.clear(name)
    await user.type(name, 'Tank')
    await user.click(screen.getByRole('radio', { name: 'Sky' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(async () =>
      expect(await getProfile(db)).toEqual({ ...original, experience: 'returning', equipment: ['bodyweight', 'band'], petName: 'Tank', petColor: 'sky' }),
    )
    expect(await screen.findByText('Saved ✓')).toBeInTheDocument()
  })

  it('lists the research behind the defaults', async () => {
    const db = await makeTestDb((d) => saveProfile(d, makeProfile()))
    renderRoutes(db, [{ path: '/profile', element: <ProfileScreen /> }], ['/profile'])
    expect(await screen.findByText(/Progression models in resistance training/)).toBeInTheDocument()
  })
})
