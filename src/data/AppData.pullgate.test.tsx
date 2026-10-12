import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeProfile, makeSession } from '../domain/testFixtures'
import { AppDataProvider, useAppData } from './AppData'
import { PocketGainsDB } from './db'
import type { Row } from './remote'
import { createSession, getProfile, loadHistory, saveProfile } from './repo'

// Cloud mode with a live session, and a remote whose first download we control.
const gate = vi.hoisted(() => {
  let open: () => void = () => undefined
  const ready = new Promise<void>((r) => (open = r))
  return { ready, open: () => open() }
})
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null }),
    },
  },
}))
vi.mock('./remote', () => ({
  supabaseRemote: () => ({
    upsert: async () => undefined,
    fetchAll: async (): Promise<Row[]> => {
      await gate.ready
      return []
    },
  }),
}))

function Probe() {
  const { ready, initialPull } = useAppData()
  return <p>{ready ? `ready:${initialPull}` : 'loading'}</p>
}

describe('startup writes wait for the first download', () => {
  it('neither finalizes orphans nor rewrites reminder days until the pull has finished', async () => {
    const db = new PocketGainsDB(`test-${crypto.randomUUID()}`)
    await saveProfile(db, makeProfile({ experience: 'consistent', onboardedAt: '2025-01-01T00:00:00.000Z', reminderDays: [] }))
    // In progress on another device more than 12 h ago; this device has not seen its newer copy yet.
    await createSession(db, makeSession({ id: 'other', startedAt: new Date(Date.now() - 13 * 3_600_000).toISOString(), status: 'in_progress', endedAt: null }))
    await db.profile.update('me', { dirty: 0 })
    await db.sessions.update('other', { dirty: 0 })

    render(<AppDataProvider database={db}><Probe /></AppDataProvider>)
    expect(await screen.findByText('ready:pending')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 50))
    expect((await getProfile(db))?.reminderDays).toEqual([])
    expect((await loadHistory(db)).sessions[0].status).toBe('in_progress')

    gate.open()
    await waitFor(async () => expect((await getProfile(db))?.reminderDays).not.toEqual([]))
    await waitFor(async () => expect((await loadHistory(db)).sessions[0].status).toBe('abandoned'))
  })
})
