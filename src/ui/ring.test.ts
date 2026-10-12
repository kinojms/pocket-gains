import { describe, expect, it } from 'vitest'
import { ringOffset } from './ring'

describe('ringOffset', () => {
  it('maps 0..1 to a full..empty dash offset and clamps the rest', () => {
    expect(ringOffset(0, 100)).toBe(100)
    expect(ringOffset(0.25, 100)).toBe(75)
    expect(ringOffset(1, 100)).toBe(0)
    expect(ringOffset(1.6, 100)).toBe(0)
    expect(ringOffset(-1, 100)).toBe(100)
    expect(ringOffset(Number.NaN, 100)).toBe(100)
  })
})
