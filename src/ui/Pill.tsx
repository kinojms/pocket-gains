import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export function Pill({ icon, tone = 'plain', label, className, role, children }: {
  icon?: IconName
  tone?: 'plain' | 'flame' | 'shield' | 'good'
  label?: string
  className?: string
  role?: string
  children: ReactNode
}) {
  return (
    <span className={`pill pill-${tone}${className ? ` ${className}` : ''}`} aria-label={label} role={role}>
      {icon && <Icon name={icon} size={18} />}
      <span>{children}</span>
    </span>
  )
}
