import { describe, expect, it } from 'vitest'
import { dayPhaseFor } from './dayPhase'

const at = (h: number, m = 0) => new Date(2026, 9, 13, h, m)

describe('dayPhaseFor', () => {
  it('splits the day at 05:00, 10:00, 17:00 and 20:00 (start inclusive)', () => {
    expect(dayPhaseFor(at(4, 59))).toBe('night')
    expect(dayPhaseFor(at(5))).toBe('morning')
    expect(dayPhaseFor(at(9, 59))).toBe('morning')
    expect(dayPhaseFor(at(10))).toBe('day')
    expect(dayPhaseFor(at(16, 59))).toBe('day')
    expect(dayPhaseFor(at(17))).toBe('sunset')
    expect(dayPhaseFor(at(19, 59))).toBe('sunset')
    expect(dayPhaseFor(at(20))).toBe('night')
    expect(dayPhaseFor(at(0))).toBe('night')
  })
})
