import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { content } from '../content'
import { RarityCard } from './RarityCard'

const settings = { sets: 3, cards: 5, rir: [1, 3] as [number, number], restSec: null, repRange: [8, 12] as [number, number] }

describe('RarityCard', () => {
  it('frames the card by rarity and shows name, rarity, muscles and stats', () => {
    const ex = content.exercises['pushup']
    render(<RarityCard exercise={ex} settings={settings}><button>Swap</button></RarityCard>)
    const card = screen.getByRole('article', { name: ex.name })
    expect(card).toHaveAttribute('data-rarity', String(ex.rarity))
    expect(card.querySelector('.rcard-type')!.textContent).toContain(['Common', 'Rare', 'Epic'][ex.rarity - 1])
    expect(card.querySelector('.rcard-type')!.textContent).toContain(ex.muscles.primary[0])
    expect(screen.getByText(/3 × 8–12/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Swap' })).toBeInTheDocument()
  })

  it('has a compact mini size without the movement line', () => {
    const { container } = render(<RarityCard exercise={content.exercises['pushup']} size="mini" />)
    expect(container.querySelector('.rcard-mini')).not.toBeNull()
    expect(container.querySelector('.rcard-meta')).toBeNull()
  })

  it('covers every rarity used in the content', () => {
    const rarities = new Set(Object.values(content.exercises).map((e) => e.rarity))
    for (const r of rarities) expect([1, 2, 3]).toContain(r)
  })
})
