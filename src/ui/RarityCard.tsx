import type { ReactNode } from 'react'
import { imageUrl } from '../content'
import { repRangeFor, restSecFor } from '../domain/session'
import type { Exercise, SessionSettings } from '../domain/types'
import { Icon } from './Icon'
import { Pet } from './Pet'

const RARITY_LABEL: Record<Exercise['rarity'], string> = { 1: 'Common', 2: 'Rare', 3: 'Epic' }
const MOVEMENT: Record<Exercise['movement'], string> = {
  push: 'Push', pull: 'Pull', squat: 'Squat', hinge: 'Hinge', core: 'Core', isolation: 'Isolation', warmup: 'Warm-up',
}
const EQUIPMENT: Record<Exercise['equipment'], string> = { bodyweight: 'Bodyweight', dumbbell: 'Dumbbell', band: 'Band' }

export function RarityCard({ exercise, settings, size = 'full', title = 'h3', wholeArt = false, children }: {
  exercise: Exercise
  settings?: SessionSettings
  size?: 'full' | 'mini'
  /** Heading level for the name; 'h1' when the card is the screen's title. */
  title?: 'h1' | 'h3'
  /** Show the whole photo (uncropped, described for screen readers), e.g. when it teaches the movement. */
  wholeArt?: boolean
  children?: ReactNode
}) {
  const Title = title
  const img = imageUrl(exercise.id)
  const [lo, hi] = settings ? repRangeFor(exercise, settings) : exercise.repRange
  const rest = settings ? restSecFor(exercise, settings) : exercise.restSec
  return (
    <article className={`rcard rcard-${size}`} data-rarity={exercise.rarity} data-art={wholeArt ? 'whole' : undefined} aria-label={exercise.name}>
      <div className="rcard-inner">
        <span className="rcard-gem" aria-hidden="true">{exercise.rarity}</span>
        <div className="rcard-art">{img ? <img src={img} alt={wholeArt ? `${exercise.name} demonstration` : ''} loading="lazy" /> : <Pet size={size === 'mini' ? 56 : 80} />}</div>
        <div className="rcard-body">
          <Title className="rcard-name">{exercise.name}</Title>
          <span className="rcard-type">{RARITY_LABEL[exercise.rarity]} · {exercise.muscles.primary.join(' / ')}</span>
          {size === 'full' && <span className="rcard-meta">{MOVEMENT[exercise.movement]} · {EQUIPMENT[exercise.equipment]}</span>}
          <div className="rcard-stats">
            <span className="badge"><Icon name="muscle" size={14} />{settings ? `${settings.sets} × ` : ''}{lo}–{hi}{exercise.perSide ? ' per side' : ''}</span>
            <span className="badge"><Icon name="timer" size={14} />{rest}s</span>
          </div>
        </div>
        {children && <div className="rcard-foot">{children}</div>}
      </div>
    </article>
  )
}
