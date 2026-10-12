import { addDays, dateKey } from './dates'
import type { DayStatus, StreakInfo } from './streak'

export interface CalendarCell {
  key: string
  day: number
  inMonth: boolean
  status: DayStatus | 'future' | 'none'
  deckId: string | null
}

export function monthGrid(
  year: number, month: number, info: StreakInfo, today: Date, plannedAt: (d: Date) => string | null,
): CalendarCell[][] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const start = addDays(first, -((first.getDay() + 6) % 7))
  const end = addDays(last, 6 - ((last.getDay() + 6) % 7))
  const todayKey = dateKey(today)
  const cells: CalendarCell[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const key = dateKey(d)
    const known = info.days.get(key)
    const inMonth = d.getMonth() === month
    if (known) cells.push({ key, day: d.getDate(), inMonth, status: known.status, deckId: known.deckId })
    else if (key > todayKey) cells.push({ key, day: d.getDate(), inMonth, status: 'future', deckId: plannedAt(d) })
    else cells.push({ key, day: d.getDate(), inMonth, status: 'none', deckId: null })
  }
  const weeks: CalendarCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}
