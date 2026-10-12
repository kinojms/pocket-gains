export interface DueProfile {
  user_id: string
  pet_name: string
  timezone: string
  reminder_enabled: boolean
  /** Postgres time, e.g. "18:00:00" */
  reminder_time: string
  nudge_enabled: boolean
  reminder_days: string[]
}

export interface DueState {
  user_id: string
  last_reminded_on: string | null
  last_nudged_on: string | null
}

export interface DueSession {
  user_id: string
  started_at: string
}

export interface DueNotification {
  userId: string
  kind: 'reminder' | 'nudge'
  localDate: string
  title: string
  body: string
}

const REMIND_UNTIL = '23:00'
const NUDGE_FROM = '09:00'
const NUDGE_UNTIL = '12:00'
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function localParts(at: Date, timeZone: string): { date: string; time: string; weekday: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  )
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday: String(parts.weekday).toLowerCase().slice(0, 3),
  }
}

function utcFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function previousDay(key: string): string {
  const d = utcFromKey(key)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function weekdayOfKey(key: string): string {
  return DAYS[utcFromKey(key).getUTCDay()]
}

export function dueNotifications(input: {
  now: Date
  profiles: DueProfile[]
  states: DueState[]
  sessions: DueSession[]
}): DueNotification[] {
  const out: DueNotification[] = []
  for (const p of input.profiles) {
    let local: ReturnType<typeof localParts>
    try {
      local = localParts(input.now, p.timezone)
    } catch {
      continue // invalid time zone: skip this user, keep the others
    }
    const trained = new Set(
      input.sessions.filter((s) => s.user_id === p.user_id).map((s) => localParts(new Date(s.started_at), p.timezone).date),
    )
    if (trained.has(local.date)) continue
    const state = input.states.find((s) => s.user_id === p.user_id)

    const remindAt = p.reminder_time.slice(0, 5)
    if (
      p.reminder_enabled && p.reminder_days.includes(local.weekday) &&
      local.time >= remindAt && local.time < REMIND_UNTIL && state?.last_reminded_on !== local.date
    ) {
      out.push({
        userId: p.user_id, kind: 'reminder', localDate: local.date,
        title: `${p.pet_name} is ready to train 💪`,
        body: "Today's hand is waiting. Even a short session keeps your streak alive.",
      })
    }

    const yesterday = previousDay(local.date)
    if (
      p.nudge_enabled && p.reminder_days.includes(weekdayOfKey(yesterday)) && !trained.has(yesterday) &&
      local.time >= NUDGE_FROM && local.time < NUDGE_UNTIL && state?.last_nudged_on !== local.date
    ) {
      out.push({
        userId: p.user_id, kind: 'nudge', localDate: local.date,
        title: `${p.pet_name} missed you yesterday`,
        body: 'A quick session today keeps your streak going 🛡️',
      })
    }
  }
  return out
}
