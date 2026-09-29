import type { PetColor } from '../domain/types'
import { PET_COLORS, PET_PALETTES } from './petColor'

export function PetColorPicker({ value, onChange }: { value: PetColor; onChange(c: PetColor): void }) {
  return (
    <div className="stack" style={{ gap: 6, width: '100%' }}>
      <span className="label">Colour</span>
      <div role="radiogroup" aria-label="Pet colour" className="swatches">
        {PET_COLORS.map((c) => (
          <button
            key={c} type="button" role="radio" aria-checked={value === c} aria-label={PET_PALETTES[c].label}
            className="swatch" style={{ background: PET_PALETTES[c].body }} onClick={() => onChange(c)}
          />
        ))}
      </div>
    </div>
  )
}
