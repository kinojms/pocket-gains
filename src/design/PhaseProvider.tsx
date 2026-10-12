import { useLayoutEffect, type ReactNode } from 'react'
import { dayPhaseFor } from '../domain/dayPhase'
import { useNow } from '../hooks/useNow'
import { applyPhase } from './palette'
import { PhaseContext } from './phaseContext'

/** Re-checks the phase every 5 minutes and whenever the app becomes visible again. */
export function PhaseProvider({ children }: { children: ReactNode }) {
  const now = useNow(5 * 60_000)
  const phase = dayPhaseFor(new Date(now))
  useLayoutEffect(() => applyPhase(phase), [phase])
  return <PhaseContext.Provider value={phase}>{children}</PhaseContext.Provider>
}
