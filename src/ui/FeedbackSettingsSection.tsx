import { useState } from 'react'
import { feedback } from '../feedback/feedback'
import { loadFeedbackSettings, saveFeedbackSettings, type FeedbackSettings } from '../feedback/settings'
import { Icon } from './Icon'

/** Per-device switches; never synced, so muting one phone leaves the others alone. */
export function FeedbackSettingsSection() {
  const [s, setS] = useState(loadFeedbackSettings)
  const update = (patch: Partial<FeedbackSettings>) => {
    const next = { ...s, ...patch }
    setS(next)
    saveFeedbackSettings(next)
    feedback('tap') // preview with the new setting
  }
  return (
    <section className="panel stack">
      <h2>Sounds &amp; vibration</h2>
      <span className="muted">Saved on this device only.</span>
      <label className="choice" aria-checked={s.sound} data-feedback="none">
        <input type="checkbox" checked={s.sound} onChange={(e) => update({ sound: e.target.checked })} />
        <Icon name="sound" /> Sounds
      </label>
      <label className="choice" aria-checked={s.vibration} data-feedback="none">
        <input type="checkbox" checked={s.vibration} onChange={(e) => update({ vibration: e.target.checked })} />
        <Icon name="vibrate" /> Vibration
      </label>
    </section>
  )
}
