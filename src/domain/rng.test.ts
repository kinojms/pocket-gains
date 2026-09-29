import { describe, expect, it } from 'vitest'
import { hashString, mulberry32, shuffled } from './rng'

describe('rng', () => {
  it('hashString is deterministic and differs for different input', () => {
    expect(hashString('abc')).toBe(hashString('abc'))
    expect(hashString('abc')).not.toBe(hashString('abd'))
  })

  it('mulberry32 is deterministic and returns values in [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i++) {
      const x = a()
      expect(x).toBe(b())
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })

  it('shuffled returns a permutation and does not mutate input', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const out = shuffled(input, mulberry32(7))
    expect(input).toEqual([1, 2, 3, 4, 5, 6])
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5, 6])
    expect(shuffled(input, mulberry32(7))).toEqual(out)
  })
})
