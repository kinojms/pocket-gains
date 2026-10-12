/** Fills on first show with a little overshoot, and slides when the value grows (see theme.css). */
export function XpBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="xpbar" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="xpbar-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}
