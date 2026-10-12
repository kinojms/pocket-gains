import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PhaseProvider } from './PhaseProvider'
import { usePhase } from './phaseContext'

function Show() {
  return <p>{usePhase()}</p>
}

describe('PhaseProvider', () => {
  afterEach(() => vi.useRealTimers())

  it('follows the clock and updates when the app becomes visible again', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 13, 19, 59))
    render(<PhaseProvider><Show /></PhaseProvider>)
    expect(screen.getByText('sunset')).toBeInTheDocument()
    expect(document.documentElement.dataset.phase).toBe('sunset')

    vi.setSystemTime(new Date(2026, 9, 13, 20, 1))
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(screen.getByText('night')).toBeInTheDocument()
    expect(document.documentElement.dataset.phase).toBe('night')
  })
})
