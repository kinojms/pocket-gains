import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MeadowScene } from './MeadowScene'

describe('MeadowScene', () => {
  it('shows its content over decorative sky and hill', () => {
    const { container } = render(<MeadowScene><p>Hello</p></MeadowScene>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(container.querySelector('.meadow-sky')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.meadow-hill')).toHaveAttribute('aria-hidden', 'true')
  })
})
