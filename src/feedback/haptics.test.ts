import { afterEach, describe, expect, it, vi } from 'vitest'
import { vibrate } from './haptics'

describe('vibrate', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'vibrate')
  })

  it('plays the pattern for each kind', () => {
    const spy = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: spy, configurable: true })
    vibrate('tap')
    vibrate('log')
    vibrate('restDone')
    expect(spy.mock.calls).toEqual([[10], [[20, 40, 20]], [300]])
  })

  it('does nothing on devices without vibration', () => {
    expect(() => vibrate('tap')).not.toThrow()
  })
})
