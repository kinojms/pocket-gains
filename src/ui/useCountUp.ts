import { useEffect, useState } from 'react'
import { prefersReducedMotion } from './motion'

/** Counts from 0 to `target` with an ease-out; shows `target` at once when motion is reduced. */
export function useCountUp(target: number, ms = 900): number {
  const [reduced] = useState(prefersReducedMotion)
  const [value, setValue] = useState(reduced ? target : 0)
  useEffect(() => {
    if (reduced) {
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      setValue(Math.round(target * (1 - (1 - p) ** 3)))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, ms, reduced])
  return value
}
