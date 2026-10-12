export function Sparkline({ values, label, width = 240, height = 56 }: { values: number[]; label: string; width?: number; height?: number }) {
  if (values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * (width - 8) + 4
    const y = height - 6 - ((v - min) / span) * (height - 12)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="sparkline">
      <polyline points={pts.join(' ')} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p) => {
        const [x, y] = p.split(',')
        return <circle key={p} cx={x} cy={y} r="3.5" fill="var(--gold)" stroke="var(--primary-base)" strokeWidth="1.5" />
      })}
    </svg>
  )
}
