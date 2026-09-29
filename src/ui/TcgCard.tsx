import type { ReactNode } from 'react'
import { imageUrl } from '../content'
import { repRangeFor, restSecFor } from '../domain/session'
import type { Exercise, SessionSettings } from '../domain/types'
import { PetSprite } from './PetSprite'

const MOVEMENT: Record<Exercise['movement'], string> = {
  push: 'Push', pull: 'Pull', squat: 'Squat', hinge: 'Hinge', core: 'Core', isolation: 'Isolation', warmup: 'Warm-up',
}
const EQUIPMENT: Record<Exercise['equipment'], string> = { bodyweight: 'Bodyweight', dumbbell: 'Dumbbell', band: 'Band' }

export function TcgCard({ exercise, settings, children }: { exercise: Exercise; settings?: SessionSettings; children?: ReactNode }) {
  const img = imageUrl(exercise.id)
  const [lo, hi] = settings ? repRangeFor(exercise, settings) : exercise.repRange
  const rest = settings ? restSecFor(exercise, settings) : exercise.restSec
  return (
    <article className="tcg" aria-label={exercise.name}>
      <div className="tcg-inner">
        <header className="tcg-head">
          <span>{exercise.name}</span>
          <span className="tcg-stars" aria-label={`${exercise.rarity} of 3 stars`}>
            {'★'.repeat(exercise.rarity)}{'☆'.repeat(3 - exercise.rarity)}
          </span>
        </header>
        <div className="tcg-art">{img ? <img src={img} alt="" loading="lazy" /> : <PetSprite size={72} />}</div>
        <div className="tcg-type">
          {MOVEMENT[exercise.movement]} · {exercise.muscles.primary.join(' / ')} · {EQUIPMENT[exercise.equipment]}
        </div>
        <div className="tcg-stats">
          <div><b>💪 Power</b> {settings ? `${settings.sets} × ` : ''}{lo}–{hi}{exercise.perSide ? ' per side' : ''}</div>
          <div><b>⏱ Recover</b> {rest}s</div>
        </div>
        {children && <div className="tcg-foot">{children}</div>}
      </div>
    </article>
  )
}
