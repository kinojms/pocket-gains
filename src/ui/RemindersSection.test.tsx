import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RemindersSection, type ReminderSettings } from './RemindersSection'

const off: ReminderSettings = { reminderEnabled: false, reminderTime: '18:00', nudgeEnabled: false }

describe('RemindersSection', () => {
  it('subscribes when reminders are switched on', async () => {
    const onChange = vi.fn()
    const subscribe = vi.fn(async () => 'ok' as const)
    render(<RemindersSection value={off} onChange={onChange} subscribe={subscribe} unsubscribe={vi.fn(async () => undefined)} />)
    await userEvent.setup().click(screen.getByRole('checkbox', { name: /Remind me on training days/ }))
    expect(subscribe).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith({ ...off, reminderEnabled: true })
  })

  it('explains how to fix blocked notifications and stays off', async () => {
    const onChange = vi.fn()
    render(<RemindersSection value={off} onChange={onChange} subscribe={async () => 'denied'} unsubscribe={vi.fn(async () => undefined)} />)
    await userEvent.setup().click(screen.getByRole('checkbox', { name: /Remind me on training days/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/blocked/)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('unsubscribes when the last reminder type is switched off, and updates the time', async () => {
    const onChange = vi.fn()
    const unsubscribe = vi.fn(async () => undefined)
    const on = { ...off, reminderEnabled: true }
    const user = userEvent.setup()
    render(<RemindersSection value={on} onChange={onChange} subscribe={vi.fn()} unsubscribe={unsubscribe} />)
    const time = screen.getByLabelText('Reminder time')
    fireEvent.change(time, { target: { value: '07:30' } })
    expect(onChange).toHaveBeenLastCalledWith({ ...on, reminderTime: '07:30' })
    await user.click(screen.getByRole('checkbox', { name: /Remind me on training days/ }))
    expect(unsubscribe).toHaveBeenCalled()
    expect(onChange).toHaveBeenLastCalledWith({ ...on, reminderEnabled: false })
  })
})
