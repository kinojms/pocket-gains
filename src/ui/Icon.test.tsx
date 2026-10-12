import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon } from './Icon'
import { ICON_NAMES } from './iconPaths'

describe('Icon', () => {
  it('is decorative unless labelled', () => {
    const { container } = render(<Icon name="flame" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    render(<Icon name="shield" label="Shield" />)
    expect(screen.getByRole('img', { name: 'Shield' })).toBeInTheDocument()
  })

  it('draws every icon in the set', () => {
    for (const name of ICON_NAMES) {
      const { container, unmount } = render(<Icon name={name} />)
      expect(container.querySelector('svg')!.childElementCount).toBeGreaterThan(0)
      unmount()
    }
  })
})
