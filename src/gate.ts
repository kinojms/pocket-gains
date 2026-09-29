export type PullState = 'idle' | 'pending' | 'done' | 'failed'
export type Gate = 'loading' | 'login' | 'restore_failed' | 'onboarding' | 'app'

export interface GateInput {
  mode: 'local' | 'cloud'
  ready: boolean
  authChecked: boolean
  signedIn: boolean
  deviceSignedIn: boolean
  initialPull: PullState
  hasProfile: boolean
}

export function gateFor(g: GateInput): Gate {
  if (!g.ready) return 'loading'
  if (g.mode === 'cloud') {
    if (!g.deviceSignedIn && !g.signedIn) return g.authChecked ? 'login' : 'loading'
    if (!g.hasProfile) {
      if (g.initialPull === 'failed') return 'restore_failed'
      if (g.initialPull !== 'done') return 'loading'
    }
  }
  return g.hasProfile ? 'app' : 'onboarding'
}
