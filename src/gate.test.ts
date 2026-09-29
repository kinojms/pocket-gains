import { describe, expect, it } from 'vitest'
import { gateFor, type GateInput } from './gate'

const local: GateInput = {
  mode: 'local', ready: true, authChecked: true, signedIn: true, deviceSignedIn: true, initialPull: 'done', hasProfile: false,
}
const cloud: GateInput = { ...local, mode: 'cloud', signedIn: false, deviceSignedIn: false, initialPull: 'idle' }

describe('gateFor', () => {
  it('local mode: loading, then onboarding or app', () => {
    expect(gateFor({ ...local, ready: false })).toBe('loading')
    expect(gateFor(local)).toBe('onboarding')
    expect(gateFor({ ...local, hasProfile: true })).toBe('app')
  })

  it('cloud, never signed in on this device: wait for auth, then login', () => {
    expect(gateFor({ ...cloud, authChecked: false })).toBe('loading')
    expect(gateFor(cloud)).toBe('login')
  })

  it('new device mid-download never shows onboarding', () => {
    const s = { ...cloud, signedIn: true, deviceSignedIn: true, initialPull: 'pending' as const }
    expect(gateFor(s)).toBe('loading')
    expect(gateFor({ ...s, initialPull: 'idle' })).toBe('loading')
  })

  it('download finished with no profile: genuinely new user -> onboarding', () => {
    expect(gateFor({ ...cloud, signedIn: true, deviceSignedIn: true, initialPull: 'done' })).toBe('onboarding')
  })

  it('download failed and nothing local: restore error, not onboarding', () => {
    expect(gateFor({ ...cloud, signedIn: true, deviceSignedIn: true, initialPull: 'failed' })).toBe('restore_failed')
  })

  it('offline with an expired token but data on the device: the app still opens', () => {
    expect(gateFor({ ...cloud, deviceSignedIn: true, signedIn: false, initialPull: 'failed', hasProfile: true })).toBe('app')
  })

  it('offline before auth is checked, with data on the device: no login detour', () => {
    expect(gateFor({ ...cloud, authChecked: false, deviceSignedIn: true, hasProfile: true })).toBe('app')
  })
})
