import type { ReactNode } from 'react'
import { ringOffset } from './ring'

export function Ring({ value, size = 220, thickness = 9, color = 'var(--primary)', track = 'var(--panel-border)', children }: {
  value: number
  size?: number
  thickness?: number
  color?: string
  track?: string
  children?: ReactNode
}) {
  const r = 50 - thickness / 2
  const c = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle
          className="ring-fill" cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={ringOffset(value, c)} transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}
