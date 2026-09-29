import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppDataProvider } from '../data/AppData'
import { PocketGainsDB } from '../data/db'
import { getProfile } from '../data/repo'
import { OnboardingScreen } from './OnboardingScreen'

function setup() {
  const db = new PocketGainsDB(`test-${crypto.randomUUID()}`)
  const router = createMemoryRouter(
    [{ path: '/onboarding', element: <OnboardingScreen /> }, { path: '/', element: <p>HOME</p> }],
    { initialEntries: ['/onboarding'] },
  )
  render(<AppDataProvider database={db}><RouterProvider router={router} /></AppDataProvider>)
  return db
}

describe('OnboardingScreen', () => {
  it('requires the safety acknowledgement, then saves experience, equipment and pet name', async () => {
    const db = setup()
    const user = userEvent.setup()

    const next = await screen.findByRole('button', { name: 'Next' })
    expect(next).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /I understand/ }))
    await user.click(next)

    await user.click(screen.getByRole('button', { name: /Returning after a break/ }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByRole('checkbox', { name: /Bodyweight/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Bodyweight/ })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /Dumbbells/ }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    const name = screen.getByRole('textbox', { name: /name/i })
    await user.clear(name)
    await user.type(name, 'Mochi')
    await user.click(screen.getByRole('button', { name: /Hatch/ }))

    await screen.findByText('HOME')
    await waitFor(async () => {
      expect(await getProfile(db)).toMatchObject({
        goal: 'muscle_strength', experience: 'returning', equipment: ['bodyweight', 'dumbbell'], petName: 'Mochi',
      })
    })
  })
})
