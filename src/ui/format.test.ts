import { describe, expect, it } from 'vitest'
import { formatClock } from './format'

describe('formatClock', () => {
  it('formats m:ss and rounds partial seconds up', () => {
    expect(formatClock(120_000)).toBe('2:00')
    expect(formatClock(59_001)).toBe('1:00')
    expect(formatClock(58_000)).toBe('0:58')
    expect(formatClock(0)).toBe('0:00')
  })
})
