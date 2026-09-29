import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { TabBar } from './TabBar'

describe('TabBar', () => {
  it('shows four always-visible tabs with icon and text label', () => {
    render(<MemoryRouter initialEntries={['/decks']}><TabBar /></MemoryRouter>)
    for (const name of ['Home', 'Decks', 'Progress', 'Profile']) {
      expect(screen.getByRole('link', { name: new RegExp(name) })).toBeVisible()
    }
    expect(screen.getByRole('link', { name: /Decks/ })).toHaveAttribute('aria-current', 'page')
  })
})
