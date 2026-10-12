import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { prefersReducedMotion } from './motion'
import { useCountUp } from './useCountUp'

function Show({ n }: { n: number }) {
  return <p>{useCountUp(n)}</p>
}

describe('motion helpers', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('treats a missing matchMedia (or the reduce setting) as reduced motion', () => {
    expect(prefersReducedMotion()).toBe(true)
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q }))
    expect(prefersReducedMotion()).toBe(true)
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q }))
    expect(prefersReducedMotion()).toBe(false)
  })

  it('shows the final number at once with reduced motion', () => {
    render(<Show n={45} />)
    expect(screen.getByText('45')).toBeInTheDocument()
  })
})
