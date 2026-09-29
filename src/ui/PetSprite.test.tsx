import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PetColorContext, PET_PALETTES } from './petColor'
import { PetSprite } from './PetSprite'

describe('PetSprite', () => {
  it('draws a smooth blob, not pixel squares, in the chosen colour', () => {
    const { container } = render(<PetSprite color="peach" />)
    expect(screen.getByRole('img', { name: 'Your pet' })).toBeInTheDocument()
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('[data-part="body"]')).toHaveAttribute('fill', PET_PALETTES.peach.body)
  })

  it('uses the colour from context when no prop is given, and mint by default', () => {
    const { container, unmount } = render(<PetSprite />)
    expect(container.querySelector('[data-part="body"]')).toHaveAttribute('fill', PET_PALETTES.mint.body)
    unmount()
    const r = render(<PetColorContext.Provider value="lavender"><PetSprite /></PetColorContext.Provider>)
    expect(r.container.querySelector('[data-part="body"]')).toHaveAttribute('fill', PET_PALETTES.lavender.body)
  })
})
