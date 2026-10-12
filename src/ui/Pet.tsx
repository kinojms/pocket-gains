import { useContext, useEffect, useState } from 'react'
import type { PetMood } from '../domain/petMood'
import type { PetColor } from '../domain/types'
import { PET_PALETTES, PetColorContext } from './petColor'

const INK = '#2d2d2d'
const TAP_MS = 3000

function Eyes({ mood }: { mood: PetMood }) {
  const line = { stroke: INK, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' as const }
  if (mood === 'relaxed') return <g><path d="M35 58 Q40 53 45 58" {...line} /><path d="M55 58 Q60 53 65 58" {...line} /></g>
  if (mood === 'sleepy') return <g><path d="M35 58 Q40 61 45 58" {...line} /><path d="M55 58 Q60 61 65 58" {...line} /></g>
  const shine = mood === 'excited' ? 2.6 : 1.8
  return (
    <g className="pet-eyes">
      <ellipse cx="40" cy="58" rx="5" ry="6.5" fill={INK} />
      <ellipse cx="60" cy="58" rx="5" ry="6.5" fill={INK} />
      <g className="pet-pupils">
        <circle cx="41.5" cy="55.5" r={shine} fill="#fff" />
        <circle cx="61.5" cy="55.5" r={shine} fill="#fff" />
      </g>
    </g>
  )
}

function Mouth({ mood }: { mood: PetMood }) {
  if (mood === 'excited' || mood === 'proud') return <path d="M44 65 Q50 75 56 65 Z" fill={INK} />
  if (mood === 'sleepy') return <ellipse cx="50" cy="68" rx="2.2" ry="2.6" fill={INK} />
  return <path d="M46 67 Q50 71 54 67" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
}

/** The kawaii blob with moods, blinking and a jump when tapped. Body traits (M4) will reshape the arms and brow. */
export function Pet({ size = 160, mood = 'happy', color, onTap }: {
  size?: number
  mood?: PetMood
  color?: PetColor
  onTap?: () => void
}) {
  const fromContext = useContext(PetColorContext)
  const p = PET_PALETTES[color ?? fromContext]
  const [tappedAt, setTappedAt] = useState(0)
  const [blinkDelay] = useState(() => `${(Math.random() * 4).toFixed(2)}s`)
  useEffect(() => {
    if (!tappedAt) return
    const id = window.setTimeout(() => setTappedAt(0), TAP_MS)
    return () => window.clearTimeout(id)
  }, [tappedAt])
  const shown: PetMood = tappedAt ? 'excited' : mood

  return (
    <div
      className={`pet${tappedAt ? ' pet-jump' : ''}`} data-mood={shown} data-tappable={onTap ? 'true' : undefined}
      style={{ width: size, height: size, ['--blink-delay' as string]: blinkDelay }}
      onClick={onTap ? () => { setTappedAt(Date.now()); onTap() } : undefined}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Your pet">
        <ellipse cx="50" cy="94" rx="26" ry="4" fill="#000" opacity=".12" />
        <g className="pet-body">
          <circle cx="38" cy="30" r="7" fill={p.shade} />
          <circle cx="62" cy="30" r="7" fill={p.shade} />
          <path data-part="body" d="M22 70 Q18 30 50 26 Q82 30 78 70 Q76 92 50 92 Q24 92 22 70Z" fill={p.body} />
          {shown === 'missed' && (
            <g stroke={INK} strokeWidth="2" strokeLinecap="round">
              <path d="M34 49 L44 46" />
              <path d="M66 49 L56 46" />
            </g>
          )}
          <Eyes mood={shown} />
          <ellipse cx="31" cy="68" rx="5" ry="3" fill={p.blush} opacity=".8" />
          <ellipse cx="69" cy="68" rx="5" ry="3" fill={p.blush} opacity=".8" />
          <Mouth mood={shown} />
          <ellipse cx="21" cy="74" rx="5" ry="7" fill={p.shade} />
          <ellipse cx="79" cy="74" rx="5" ry="7" fill={p.shade} />
        </g>
        {shown === 'proud' && (
          <g className="pet-sparkles" fill="#ffd34d">
            <path d="M14 24 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
            <path d="M86 38 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z" />
          </g>
        )}
        {shown === 'sleepy' && (
          <g className="pet-z" fill="currentColor" fontFamily="var(--font-display)" fontWeight="700">
            <text x="74" y="30" fontSize="11">z</text>
            <text x="83" y="19" fontSize="8">z</text>
          </g>
        )}
      </svg>
    </div>
  )
}
