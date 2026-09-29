import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeProfile } from '../domain/testFixtures'
import { AppDataProvider, useAppData } from './AppData'
import { PocketGainsDB } from './db'
import { getProfile, saveProfile } from './repo'

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null }),
    },
  },
}))

function SignOut() {
  const { signOut } = useAppData()
  return <button onClick={() => void signOut()}>out</button>
}

describe('signOut', () => {
  it('clears local data and reloads so no stale pull state or in-flight download survives', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    const db = new PocketGainsDB(`test-${crypto.randomUUID()}`)
    await saveProfile(db, makeProfile())
    render(<AppDataProvider database={db}><SignOut /></AppDataProvider>)
    await userEvent.setup().click(screen.getByRole('button', { name: 'out' }))
    await waitFor(() => expect(reload).toHaveBeenCalled())
    expect(await getProfile(db)).toBeNull()
    vi.unstubAllGlobals()
  })
})
