import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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
    // The app keeps reminderDays matching today's plan; the form must not write a stale copy back.
    await waitFor(async () => expect((await getProfile(db))?.reminderDays).not.toEqual([]))
    const reminderDays = (await getProfile(db))!.reminderDays
    const writes = vi.spyOn(db.profile, 'put')

    await user.click(await screen.findByRole('button', { name: /Returning after a break/ }))
    await user.click(screen.getByRole('checkbox', { name: /Resistance bands/ }))
    const name = screen.getByRole('textbox', { name: /Pet name/ })
    await user.clear(name)
    await user.type(name, 'Tank')
    await user.click(screen.getByRole('radio', { name: 'Sky' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved ✓')).toBeInTheDocument()
    expect(await getProfile(db)).toMatchObject({
      experience: 'returning', equipment: ['bodyweight', 'band'], petName: 'Tank', petColor: 'sky', onboardedAt: original.onboardedAt, reminderDays,
    })
    for (const [row] of writes.mock.calls) expect(row.reminderDays).toEqual(reminderDays)
  })

  it('lists the research behind the defaults', async () => {
    const db = await makeTestDb((d) => saveProfile(d, makeProfile()))
    renderRoutes(db, [{ path: '/profile', element: <ProfileScreen /> }], ['/profile'])
    expect(await screen.findByText(/Progression models in resistance training/)).toBeInTheDocument()
  })
})
