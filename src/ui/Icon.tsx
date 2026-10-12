import { PATHS, type IconName } from './iconPaths'

export type { IconName } from './iconPaths'

/** Rounded hand-drawn icons in `currentColor`. Decorative unless `label` is given. */
export function Icon({ name, size = 22, label, className }: { name: IconName; size?: number; label?: string; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
      strokeLinecap="round" strokeLinejoin="round" className={className ? `icon ${className}` : 'icon'}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {PATHS[name]}
    </svg>
  )
}
