import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RemindersSection, type ReminderSettings } from './RemindersSection'

const off: ReminderSettings = { reminderEnabled: false, reminderTime: '18:00', nudgeEnabled: false }

describe('RemindersSection', () => {
  it('subscribes when reminders are switched on', async () => {
    const onChange = vi.fn()
    const subscribe = vi.fn(async () => 'ok' as const)
    render(<RemindersSection value={off} onChange={onChange} subscribe={subscribe} unsubscribe={vi.fn(async () => undefined)} deviceReady={async () => true} />)
    await userEvent.setup().click(screen.getByRole('checkbox', { name: /Remind me on training days/ }))
    expect(subscribe).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith({ ...off, reminderEnabled: true })
  })

  it('explains how to fix blocked notifications and stays off', async () => {
    const onChange = vi.fn()
    render(<RemindersSection value={off} onChange={onChange} subscribe={async () => 'denied'} unsubscribe={vi.fn(async () => undefined)} deviceReady={async () => true} />)
    await userEvent.setup().click(screen.getByRole('checkbox', { name: /Remind me on training days/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/blocked/)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('unsubscribes when the last reminder type is switched off, and updates the time', async () => {
    const onChange = vi.fn()
    const unsubscribe = vi.fn(async () => undefined)
    const on = { ...off, reminderEnabled: true }
    const user = userEvent.setup()
    render(<RemindersSection value={on} onChange={onChange} subscribe={vi.fn()} unsubscribe={unsubscribe} deviceReady={async () => true} />)
    const time = screen.getByLabelText('Reminder time')
    fireEvent.change(time, { target: { value: '07:30' } })
    expect(onChange).toHaveBeenLastCalledWith({ ...on, reminderTime: '07:30' })
    await user.click(screen.getByRole('checkbox', { name: /Remind me on training days/ }))
    expect(unsubscribe).toHaveBeenCalled()
    expect(onChange).toHaveBeenLastCalledWith({ ...on, reminderEnabled: false })
  })

  it('offers to set up this phone when reminders are on for the account but this device is not subscribed', async () => {
    const subscribe = vi.fn(async () => 'ok' as const)
    const on = { ...off, reminderEnabled: true }
    render(<RemindersSection value={on} onChange={vi.fn()} subscribe={subscribe} unsubscribe={vi.fn(async () => undefined)} deviceReady={async () => false} />)
    expect(await screen.findByText(/not on this phone yet/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Turn on for this phone' }))
    expect(subscribe).toHaveBeenCalled()
    expect(screen.queryByText(/not on this phone yet/)).toBeNull()
  })

  it('keeps the reminder time within the hours reminders are sent (until 22:45)', () => {
    const onChange = vi.fn()
    const on = { ...off, reminderEnabled: true }
    render(<RemindersSection value={on} onChange={onChange} subscribe={vi.fn()} unsubscribe={vi.fn(async () => undefined)} deviceReady={async () => true} />)
    const time = screen.getByLabelText('Reminder time')
    expect(time).toHaveAttribute('max', '22:45')
    fireEvent.change(time, { target: { value: '23:30' } })
    expect(onChange).toHaveBeenLastCalledWith({ ...on, reminderTime: '22:45' })
    expect(screen.getByText(/latest is 22:45/)).toBeInTheDocument()
  })
})
