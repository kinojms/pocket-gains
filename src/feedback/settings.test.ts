import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_FEEDBACK, loadFeedbackSettings, saveFeedbackSettings } from './settings'

describe('feedback settings', () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('defaults to sound and vibration on', () => {
    expect(loadFeedbackSettings()).toEqual({ sound: true, vibration: true })
    expect(DEFAULT_FEEDBACK).toEqual({ sound: true, vibration: true })
  })

  it('remembers the choice on this device', () => {
    saveFeedbackSettings({ sound: false, vibration: true })
    expect(loadFeedbackSettings()).toEqual({ sound: false, vibration: true })
  })

  it('falls back to defaults for junk or missing fields', () => {
    localStorage.setItem('pg.feedback', '{not json')
    expect(loadFeedbackSettings()).toEqual({ sound: true, vibration: true })
    localStorage.setItem('pg.feedback', JSON.stringify({ sound: 'no' }))
    expect(loadFeedbackSettings()).toEqual({ sound: true, vibration: true })
  })

  it('never throws when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(loadFeedbackSettings()).toEqual({ sound: true, vibration: true })
    expect(() => saveFeedbackSettings({ sound: false, vibration: false })).not.toThrow()
  })
})
