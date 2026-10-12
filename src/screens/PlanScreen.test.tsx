import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { loadPlans, saveProfile } from '../data/repo'
import { makeProfile } from '../domain/testFixtures'
import { makeTestDb, renderRoutes } from '../test/renderApp'
import { PlanScreen } from './PlanScreen'

const routes = [{ path: '/plan', element: <PlanScreen /> }]
const consistent = makeProfile({ experience: 'consistent', onboardedAt: '2025-01-01T00:00:00.000Z' })

describe('PlanScreen', () => {
  it('starts from the recommended week and saves a custom one', async () => {
    const db = await makeTestDb((d) => saveProfile(d, consistent))
    const user = userEvent.setup()
    renderRoutes(db, routes, ['/plan'])
    const monday = await screen.findByRole('combobox', { name: 'Monday' })
    expect(monday).toHaveValue('push')
    expect(screen.getByText(/Using the recommended week/)).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Thursday' }), '')
    expect(await screen.findByText(/Upper Body: Pull \+ Arms isn't in your week/)).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Friday' }), 'pull')
    expect(screen.queryByText(/isn't in your week/)).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Save my week' }))
    await waitFor(async () => {
      const [p] = await loadPlans(db)
      expect(p).toMatchObject({ isCustom: true, days: { mon: 'push', tue: 'lower', thu: null, fri: 'pull', sat: 'lower' } })
    })
    expect(await screen.findByText('Saved ✓')).toBeInTheDocument()
  })

  it('can switch back to the recommended week', async () => {
    const db = await makeTestDb((d) => saveProfile(d, consistent))
    const user = userEvent.setup()
    renderRoutes(db, routes, ['/plan'])
    await user.click(await screen.findByRole('button', { name: 'Use recommended' }))
    await waitFor(async () => expect((await loadPlans(db))[0]?.isCustom).toBe(false))
  })
})
