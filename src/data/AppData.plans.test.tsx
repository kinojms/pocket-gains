import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { REST_WEEK } from '../domain/plan'
import { makeProfile } from '../domain/testFixtures'
import { AppDataProvider, useAppData } from './AppData'
import { PocketGainsDB } from './db'
import { getProfile, savePlan, saveProfile } from './repo'

function Probe() {
  const { ready, plans } = useAppData()
  return <p>{ready ? `plans:${plans.length}` : 'loading'}</p>
}

describe('plans in app state', () => {
  it('exposes saved plans and keeps reminderDays matching the plan in effect today', async () => {
    const db = new PocketGainsDB(`test-${crypto.randomUUID()}`)
    await saveProfile(db, makeProfile({ experience: 'consistent', onboardedAt: '2025-01-01T00:00:00.000Z', reminderDays: [] }))
    await savePlan(db, { ...REST_WEEK, tue: 'push', fri: 'pull' }, true, new Date(2025, 5, 1))
    render(<AppDataProvider database={db}><Probe /></AppDataProvider>)
    expect(await screen.findByText('plans:1')).toBeInTheDocument()
    await waitFor(async () => expect((await getProfile(db))?.reminderDays).toEqual(['tue', 'fri']))
  })
})
