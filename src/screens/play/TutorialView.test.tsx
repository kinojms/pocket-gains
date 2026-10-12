import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { content } from '../../content'
import { TutorialView } from './TutorialView'

const settings = { sets: 3, cards: 5, rir: [1, 3] as [number, number], restSec: null, repRange: null }

describe('TutorialView', () => {
  it('titles the screen with the exercise and shows the whole demonstration photo', () => {
    const ex = content.exercises['pushup']
    render(<TutorialView exercise={ex} settings={settings} mode="full" readyLabel="I'm ready. Start set 1" onReady={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: ex.name })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: `${ex.name} demonstration` })).toBeInTheDocument()
    expect(document.querySelector('.rcard')).toHaveAttribute('data-art', 'whole')
  })
})
