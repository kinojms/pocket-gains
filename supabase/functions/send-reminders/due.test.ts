import { describe, expect, it } from 'vitest'
import { dueNotifications, localParts, previousDay, weekdayOfKey, type DueProfile } from './due'

const TZ = 'Asia/Manila' // UTC+8, no DST
const base: DueProfile = {
  user_id: 'u1', pet_name: 'Mochi', timezone: TZ, reminder_enabled: true, reminder_time: '18:00:00',
  nudge_enabled: false, reminder_days: ['mon', 'thu'],
}
// 2026-10-05 is a Monday
const at = (utc: string) => new Date(utc)
const due = (now: string, o: Partial<{ profile: Partial<DueProfile>; reminded: string; nudged: string; sessions: string[] }> = {}) =>
  dueNotifications({
    now: at(now),
    profiles: [{ ...base, ...o.profile }],
    states: o.reminded || o.nudged ? [{ user_id: 'u1', last_reminded_on: o.reminded ?? null, last_nudged_on: o.nudged ?? null }] : [],
    sessions: (o.sessions ?? []).map((s) => ({ user_id: 'u1', started_at: s })),
  })

describe('localParts', () => {
  it('converts to the user time zone, including across the date line', () => {
    expect(localParts(at('2026-10-05T10:15:00Z'), TZ)).toEqual({ date: '2026-10-05', time: '18:15', weekday: 'mon' })
    expect(localParts(at('2026-10-05T20:00:00Z'), TZ)).toEqual({ date: '2026-10-06', time: '04:00', weekday: 'tue' })
  })

  it('date helpers', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28')
    expect(weekdayOfKey('2026-10-05')).toBe('mon')
  })
})

describe('dueNotifications: reminders', () => {
  it('is due after the reminder time on a reminder day', () => {
    const [n] = due('2026-10-05T10:15:00Z')
    expect(n).toMatchObject({ userId: 'u1', kind: 'reminder', localDate: '2026-10-05' })
    expect(n.title).toContain('Mochi')
  })

  it('is not due before the time, after 23:00, on other days, when disabled, or when already sent today', () => {
    expect(due('2026-10-05T09:59:00Z')).toEqual([])
    expect(due('2026-10-05T15:05:00Z')).toEqual([])
    expect(due('2026-10-06T10:15:00Z')).toEqual([])
    expect(due('2026-10-05T10:15:00Z', { profile: { reminder_enabled: false } })).toEqual([])
    expect(due('2026-10-05T10:15:00Z', { reminded: '2026-10-05' })).toEqual([])
  })

  it('is skipped once a session started that local day', () => {
    expect(due('2026-10-05T10:15:00Z', { sessions: ['2026-10-05T01:00:00Z'] })).toEqual([])
    // 2026-10-04T20:00Z is 04:00 on Oct 5 local, so it counts as today
    expect(due('2026-10-05T10:15:00Z', { sessions: ['2026-10-04T20:00:00Z'] })).toEqual([])
  })
})

describe('dueNotifications: morning nudge', () => {
  const nudgeOn = { profile: { nudge_enabled: true, reminder_enabled: false } }

  it('nudges the morning after a missed reminder day', () => {
    const out = due('2026-10-06T02:00:00Z', nudgeOn) // Tue 10:00 local; Monday had no session
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ kind: 'nudge', localDate: '2026-10-06' })
  })

  it('does not nudge if yesterday was trained, outside 09:00-12:00, or twice', () => {
    expect(due('2026-10-06T02:00:00Z', { ...nudgeOn, sessions: ['2026-10-05T11:00:00Z'] })).toEqual([])
    expect(due('2026-10-06T04:30:00Z', nudgeOn)).toEqual([])
    expect(due('2026-10-06T02:00:00Z', { ...nudgeOn, nudged: '2026-10-06' })).toEqual([])
  })
})

it('skips a profile with an invalid time zone without failing the others', () => {
  const out = dueNotifications({
    now: at('2026-10-05T10:15:00Z'),
    profiles: [{ ...base, user_id: 'bad', timezone: 'Not/AZone' }, base],
    states: [],
    sessions: [],
  })
  expect(out.map((n) => n.userId)).toEqual(['u1'])
})
