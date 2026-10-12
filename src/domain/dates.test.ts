import { describe, expect, it } from 'vitest'
import { addDays, dateKey, fromKey, weekKey, weekdayOf } from './dates'

describe('dates', () => {
  it('formats and parses local calendar days', () => {
    const d = new Date(2026, 0, 5, 23, 50)
    expect(dateKey(d)).toBe('2026-01-05')
    expect(dateKey(fromKey('2026-01-05'))).toBe('2026-01-05')
  })

  it('addDays walks calendar days with no gaps or repeats, including across DST changes', () => {
    let d = new Date(2026, 0, 1, 12)
    const seen = new Set<string>()
    for (let i = 0; i < 400; i++) {
      const next = addDays(d, 1)
      expect(next.getHours()).toBe(0)
      seen.add(dateKey(next))
      expect(fromKey(dateKey(next)).getTime() - fromKey(dateKey(d)).getTime()).toBeGreaterThan(20 * 3_600_000)
      d = next
    }
    expect(seen.size).toBe(400)
  })

  it('weekdays and ISO weeks start on Monday', () => {
    expect(weekdayOf(new Date(2026, 0, 5))).toBe('mon')
    expect(weekdayOf(new Date(2026, 0, 11))).toBe('sun')
    expect(weekKey(new Date(2026, 0, 11, 22))).toBe('2026-01-05')
    expect(weekKey(new Date(2026, 0, 12))).toBe('2026-01-12')
  })
})
