import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { content } from '../../content'
import { SetView } from './SetView'

const settings = { sets: 3, cards: 5, rir: [1, 3] as [number, number], restSec: null, repRange: null }

describe('SetView', () => {
  it('counts reps and logs them', async () => {
    const onLog = vi.fn()
    const user = userEvent.setup()
    render(
      <SetView exercise={content.exercises['pushup']} settings={settings} setNo={1} initialReps={8} initialWeight={null}
        onLog={onLog} onHurt={vi.fn()} onShowTutorial={vi.fn()} />,
    )
    expect(screen.getByText(/Target 8–15/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'One more rep' }))
    await user.click(screen.getByRole('button', { name: 'One more rep' }))
    await user.click(screen.getByRole('button', { name: 'One fewer rep' }))
    await user.click(screen.getByRole('button', { name: /Log set/ }))
    expect(onLog).toHaveBeenCalledWith(9, null)
    expect(screen.queryByText(/kg/)).toBeNull()
  })

  it('shows a weight control for dumbbell moves and reports pain with current reps', async () => {
    const onHurt = vi.fn()
    const user = userEvent.setup()
    render(
      <SetView exercise={content.exercises['db-curl']} settings={settings} setNo={2} initialReps={4} initialWeight={8}
        onLog={vi.fn()} onHurt={onHurt} onShowTutorial={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: 'More weight' }))
    expect(screen.getByText('9 kg')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /This hurts/ }))
    expect(onHurt).toHaveBeenCalledWith(4, 9)
  })
})
