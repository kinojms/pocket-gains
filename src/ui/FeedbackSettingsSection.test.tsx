import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { loadFeedbackSettings } from '../feedback/settings'
import { FeedbackSettingsSection } from './FeedbackSettingsSection'

describe('FeedbackSettingsSection', () => {
  afterEach(() => localStorage.clear())

  it('shows both switches on by default and saves changes on this device', async () => {
    const user = userEvent.setup()
    render(<FeedbackSettingsSection />)
    const sounds = screen.getByRole('checkbox', { name: /Sounds/ })
    const vibration = screen.getByRole('checkbox', { name: /Vibration/ })
    expect(sounds).toBeChecked()
    expect(vibration).toBeChecked()
    await user.click(sounds)
    expect(sounds).not.toBeChecked()
    expect(loadFeedbackSettings()).toEqual({ sound: false, vibration: true })
  })
})
