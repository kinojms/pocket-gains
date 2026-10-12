import { useState } from 'react'
import type { PushResult } from '../data/push'

export interface ReminderSettings {
  reminderEnabled: boolean
  reminderTime: string
  nudgeEnabled: boolean
}

const PROBLEM: Record<Exclude<PushResult, 'ok'> | 'error', string> = {
  denied: 'Notifications are blocked for Pocket Gains. Allow them in Chrome ⋮ → Settings → Site settings → Notifications, then try again.',
  unsupported: "This browser can't receive reminders. Install Pocket Gains to your home screen and open it from there.",
  error: "Couldn't turn on reminders. Check your connection and try again.",
}

export function RemindersSection({ value, onChange, subscribe, unsubscribe }: {
  value: ReminderSettings
  onChange(v: ReminderSettings): void
  subscribe(): Promise<PushResult>
  unsubscribe(): Promise<void>
}) {
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function toggle(kind: 'reminderEnabled' | 'nudgeEnabled', on: boolean) {
    setProblem(null)
    const next = { ...value, [kind]: on }
    const wasOff = !value.reminderEnabled && !value.nudgeEnabled
    if (on && wasOff) {
      setBusy(true)
      let result: PushResult | 'error'
      try {
        result = await subscribe()
      } catch {
        result = 'error'
      } finally {
        setBusy(false)
      }
      if (result !== 'ok') {
        setProblem(PROBLEM[result])
        return
      }
    }
    if (!next.reminderEnabled && !next.nudgeEnabled) await unsubscribe().catch(() => undefined)
    onChange(next)
  }

  return (
    <section className="stack">
      <h2>Reminders</h2>
      <label className="choice" aria-checked={value.reminderEnabled}>
        <input type="checkbox" checked={value.reminderEnabled} disabled={busy} onChange={(e) => void toggle('reminderEnabled', e.target.checked)} />
        Remind me on training days
      </label>
      <label className="row spread">
        <span>Reminder time</span>
        <input
          type="time" aria-label="Reminder time" value={value.reminderTime} disabled={!value.reminderEnabled}
          onChange={(e) => e.target.value && onChange({ ...value, reminderTime: e.target.value })}
        />
      </label>
      <label className="choice" aria-checked={value.nudgeEnabled}>
        <input type="checkbox" checked={value.nudgeEnabled} disabled={busy} onChange={(e) => void toggle('nudgeEnabled', e.target.checked)} />
        Morning nudge after a missed training day
      </label>
      {problem && <p role="alert" className="panel">{problem}</p>}
      <p className="muted" style={{ fontSize: 13 }}>
        At most one reminder a day, only on days in your week, and never after you've trained.
      </p>
    </section>
  )
}
