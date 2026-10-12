import { useEffect, useState } from 'react'

/** Starts empty and fills (with a little overshoot, see theme.css) to the current value. */
export function XpBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const [shown, setShown] = useState(0)
  useEffect(() => setShown(pct), [pct])
  return (
    <div className="xpbar" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="xpbar-fill" style={{ width: `${shown}%` }} />
    </div>
  )
}
