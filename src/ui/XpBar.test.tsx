import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { XpBar } from './XpBar'

describe('XpBar', () => {
  it('reports progress and fills to the right width', async () => {
    const { container } = render(<XpBar value={30} max={60} label="30 of 60 XP to next level" />)
    const bar = screen.getByRole('progressbar', { name: '30 of 60 XP to next level' })
    expect(bar).toHaveAttribute('aria-valuenow', '30')
    expect(bar).toHaveAttribute('aria-valuemax', '60')
    await waitFor(() => expect(container.querySelector('.xpbar-fill')).toHaveStyle({ width: '50%' }))
  })

  it('never overflows', async () => {
    const { container } = render(<XpBar value={90} max={60} label="full" />)
    await waitFor(() => expect(container.querySelector('.xpbar-fill')).toHaveStyle({ width: '100%' }))
  })
})
