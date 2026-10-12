import { describe, expect, it } from 'vitest'
import { monthGrid } from './calendar'
import type { StreakInfo } from './streak'

const info: StreakInfo = {
  current: 1, best: 1, shieldAvailable: true,
  days: new Map([
    ['2026-01-05', { key: '2026-01-05', status: 'done', deckId: 'push' }],
    ['2026-01-06', { key: '2026-01-06', status: 'pending', deckId: 'lower' }],
  ]),
}

describe('monthGrid', () => {
  it('builds Monday-first weeks covering the whole month', () => {
    const grid = monthGrid(2026, 0, info, new Date(2026, 0, 6, 9), (d) => (d.getDay() === 4 ? 'pull' : null))
    expect(grid).toHaveLength(5)
    expect(grid[0][0]).toMatchObject({ key: '2025-12-29', inMonth: false, status: 'none' })
    expect(grid[4][6].key).toBe('2026-02-01')
    const cells = grid.flat()
    expect(cells.find((c) => c.key === '2026-01-05')).toMatchObject({ status: 'done', deckId: 'push', day: 5, inMonth: true })
    expect(cells.find((c) => c.key === '2026-01-08')).toMatchObject({ status: 'future', deckId: 'pull' })
    expect(cells.find((c) => c.key === '2026-01-07')).toMatchObject({ status: 'future', deckId: null })
  })
})
