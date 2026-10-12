import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./feedback', () => ({ feedback: vi.fn() }))
const { feedback } = await import('./feedback')
const { tapKindFor, useTapFeedback } = await import('./useTapFeedback')

function Harness() {
  useTapFeedback()
  return (
    <div>
      <button className="btn">Plain</button>
      <button className="btn" data-feedback="log">Log</button>
      <button className="btn" data-feedback="none">Quiet</button>
      <label className="choice"><input type="checkbox" /> Dumbbells</label>
      <p>Text</p>
    </div>
  )
}

describe('tap feedback', () => {
  afterEach(() => vi.mocked(feedback).mockClear())

  it('picks the kind from the nearest button', () => {
    render(<Harness />)
    expect(tapKindFor(screen.getByText('Plain'))).toBe('tap')
    expect(tapKindFor(screen.getByText('Log'))).toBe('log')
    expect(tapKindFor(screen.getByText('Quiet'))).toBeNull()
    expect(tapKindFor(screen.getByText('Text'))).toBeNull()
    expect(tapKindFor(null)).toBeNull()
  })

  it('gives feedback when a button is tapped', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('Plain'))
    expect(feedback).toHaveBeenCalledWith('tap')
  })

  it('still taps a button that disables itself when clicked (React commits before the event reaches document)', () => {
    render(<Harness />)
    const plain = screen.getByText('Plain') as HTMLButtonElement
    plain.addEventListener('click', () => { plain.disabled = true })
    fireEvent.click(plain)
    expect(feedback).toHaveBeenCalledWith('tap')
  })

  it('gives one feedback per tap, even for a label that also clicks its checkbox', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText(/Dumbbells/)) // label click + synthetic input click
    expect(feedback).toHaveBeenCalledTimes(1)
  })
})
