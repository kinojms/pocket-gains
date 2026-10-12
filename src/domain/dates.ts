export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export const WEEKDAYS: readonly Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

const pad = (n: number) => String(n).padStart(2, '0')

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Calendar arithmetic (never +24 h), so DST changes can't skip or repeat a day. */
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function weekdayOf(d: Date): Weekday {
  return WEEKDAYS[(d.getDay() + 6) % 7]
}

/** dateKey of the Monday that starts d's ISO week. */
export function weekKey(d: Date): string {
  return dateKey(addDays(d, -((d.getDay() + 6) % 7)))
}
