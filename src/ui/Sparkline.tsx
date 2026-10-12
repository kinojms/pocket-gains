export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length === 0) return null
  const w = 240
  const h = 56
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * (w - 8) + 4
    const y = h - 6 - ((v - min) / span) * (h - 12)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="sparkline">
      <polyline points={pts.join(' ')} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p) => {
        const [x, y] = p.split(',')
        return <circle key={p} cx={x} cy={y} r="3.5" fill="var(--accent-2)" />
      })}
    </svg>
  )
}
