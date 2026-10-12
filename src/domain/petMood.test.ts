import { describe, expect, it } from 'vitest'
import { missedYesterday, petMood } from './petMood'
import type { DayInfo } from './streak'

const base = { phase: 'day' as const, plannedToday: true, trainedToday: false, missedYesterday: false }

describe('petMood', () => {
  it('follows the priority: proud > sleepy > missed > excited > relaxed', () => {
    expect(petMood({ ...base, trainedToday: true, phase: 'night', missedYesterday: true })).toBe('proud')
    expect(petMood({ ...base, phase: 'night', missedYesterday: true })).toBe('sleepy')
    expect(petMood({ ...base, missedYesterday: true })).toBe('missed')
    expect(petMood(base)).toBe('excited')
    expect(petMood({ ...base, plannedToday: false })).toBe('relaxed')
  })
})

describe('missedYesterday', () => {
  const day = (key: string, status: DayInfo['status']): [string, DayInfo] => [key, { key, status, deckId: 'push' }]

  it('is true when yesterday was a planned day without training (shielded or not)', () => {
    const today = new Date(2026, 9, 13, 9)
    expect(missedYesterday(new Map([day('2026-10-12', 'missed')]), today)).toBe(true)
    expect(missedYesterday(new Map([day('2026-10-12', 'shielded')]), today)).toBe(true)
    expect(missedYesterday(new Map([day('2026-10-12', 'done')]), today)).toBe(false)
    expect(missedYesterday(new Map([day('2026-10-12', 'rest')]), today)).toBe(false)
    expect(missedYesterday(new Map(), today)).toBe(false)
  })
})
