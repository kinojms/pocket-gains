import { createContext, useContext } from 'react'
import type { DayPhase } from '../domain/dayPhase'

export const PhaseContext = createContext<DayPhase>('day')

export function usePhase(): DayPhase {
  return useContext(PhaseContext)
}
