import { useContext } from 'react'
import type { PetColor } from '../domain/types'
import { PET_PALETTES, PetColorContext } from './petColor'

// Kawaii blob (M1). Body traits (M4) will reshape the arms and brow.
export function PetSprite({ size = 160, bounce = false, color }: { size?: number; bounce?: boolean; color?: PetColor }) {
  const fromContext = useContext(PetColorContext)
  const p = PET_PALETTES[color ?? fromContext]
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={bounce ? 'pet-squish' : undefined} role="img" aria-label="Your pet">
      <ellipse cx="50" cy="94" rx="26" ry="4" fill="#000" opacity=".12" />
      <circle cx="38" cy="30" r="7" fill={p.shade} />
      <circle cx="62" cy="30" r="7" fill={p.shade} />
      <path data-part="body" d="M22 70 Q18 30 50 26 Q82 30 78 70 Q76 92 50 92 Q24 92 22 70Z" fill={p.body} />
      <ellipse cx="40" cy="58" rx="5" ry="6.5" fill="#2d2d2d" />
      <ellipse cx="60" cy="58" rx="5" ry="6.5" fill="#2d2d2d" />
      <circle cx="41.5" cy="55.5" r="1.8" fill="#fff" />
      <circle cx="61.5" cy="55.5" r="1.8" fill="#fff" />
      <ellipse cx="31" cy="68" rx="5" ry="3" fill={p.blush} opacity=".8" />
      <ellipse cx="69" cy="68" rx="5" ry="3" fill={p.blush} opacity=".8" />
      <path d="M46 67 Q50 71 54 67" stroke="#2d2d2d" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="21" cy="74" rx="5" ry="7" fill={p.shade} />
      <ellipse cx="79" cy="74" rx="5" ry="7" fill={p.shade} />
    </svg>
  )
}
