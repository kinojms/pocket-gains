import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeProfile } from '../domain/testFixtures'
import { AppDataProvider, useAppData } from './AppData'
import { PocketGainsDB } from './db'
import { saveProfile } from './repo'

function Probe() {
  const { ready, profile } = useAppData()
  return <p>{ready ? `ready:${profile?.petName}` : 'loading'}</p>
}

describe('startup recovery', () => {
  it('still finishes loading when session recovery fails', async () => {
    const db = new PocketGainsDB(`test-${crypto.randomUUID()}`)
    await saveProfile(db, makeProfile({ petName: 'Mochi' }))
    vi.spyOn(db.kv, 'get').mockRejectedValueOnce(new Error('closed'))
    render(<AppDataProvider database={db}><Probe /></AppDataProvider>)
    expect(await screen.findByText('ready:Mochi')).toBeInTheDocument()
  })
})
