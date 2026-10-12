export type DayPhase = 'morning' | 'day' | 'sunset' | 'night'

/** Local-time phase that drives the sky and the app's colours. */
export function dayPhaseFor(d: Date): DayPhase {
  const h = d.getHours()
  if (h >= 5 && h < 10) return 'morning'
  if (h >= 10 && h < 17) return 'day'
  if (h >= 17 && h < 20) return 'sunset'
  return 'night'
}
