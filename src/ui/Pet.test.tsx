import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Pet } from './Pet'
import { PetColorContext, PET_PALETTES } from './petColor'

const wrapper = (c: HTMLElement) => c.querySelector('.pet') as HTMLElement

describe('Pet', () => {
  afterEach(() => vi.useRealTimers())

  it('draws a smooth blob in the chosen colour, from the prop or context', () => {
    const { container, unmount } = render(<Pet color="peach" />)
    expect(screen.getByRole('img', { name: 'Your pet' })).toBeInTheDocument()
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('[data-part="body"]')).toHaveAttribute('fill', PET_PALETTES.peach.body)
    unmount()
    const r = render(<PetColorContext.Provider value="lavender"><Pet /></PetColorContext.Provider>)
    expect(r.container.querySelector('[data-part="body"]')).toHaveAttribute('fill', PET_PALETTES.lavender.body)
  })

  it('shows its mood', () => {
    const { container, rerender } = render(<Pet mood="sleepy" />)
    expect(wrapper(container)).toHaveAttribute('data-mood', 'sleepy')
    expect(container.querySelector('.pet-z')).not.toBeNull()
    rerender(<Pet mood="proud" />)
    expect(container.querySelector('.pet-sparkles')).not.toBeNull()
  })

  it('perks up for 3 seconds when tapped', () => {
    vi.useFakeTimers()
    const onTap = vi.fn()
    const { container } = render(<Pet mood="sleepy" onTap={onTap} />)
    fireEvent.click(wrapper(container))
    expect(onTap).toHaveBeenCalledTimes(1)
    expect(wrapper(container)).toHaveAttribute('data-mood', 'excited')
    act(() => vi.advanceTimersByTime(3000))
    expect(wrapper(container)).toHaveAttribute('data-mood', 'sleepy')
  })
})
