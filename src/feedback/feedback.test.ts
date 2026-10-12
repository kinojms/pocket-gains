import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./sound', () => ({ playSound: vi.fn() }))
vi.mock('./haptics', () => ({ vibrate: vi.fn() }))

const { feedback } = await import('./feedback')
const { playSound } = await import('./sound')
const { vibrate } = await import('./haptics')
const { saveFeedbackSettings } = await import('./settings')

describe('feedback', () => {
  afterEach(() => {
    localStorage.clear()
    vi.mocked(playSound).mockClear()
    vi.mocked(vibrate).mockClear()
  })

  it('plays sound and vibration by default', () => {
    feedback('log')
    expect(playSound).toHaveBeenCalledWith('log')
    expect(vibrate).toHaveBeenCalledWith('log')
  })

  it('respects each switch', () => {
    saveFeedbackSettings({ sound: false, vibration: true })
    feedback('tap')
    expect(playSound).not.toHaveBeenCalled()
    expect(vibrate).toHaveBeenCalledWith('tap')

    saveFeedbackSettings({ sound: true, vibration: false })
    feedback('tap')
    expect(playSound).toHaveBeenCalledWith('tap')
    expect(vibrate).toHaveBeenCalledTimes(1)
  })

  it('keeps a switch working for this visit when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    saveFeedbackSettings({ sound: false, vibration: true })
    feedback('tap')
    expect(playSound).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
