import { vibrate } from './haptics'
import type { FeedbackKind } from './kinds'
import { loadFeedbackSettings } from './settings'
import { playSound } from './sound'

export function feedback(kind: FeedbackKind): void {
  const s = loadFeedbackSettings()
  if (s.sound) playSound(kind)
  if (s.vibration) vibrate(kind)
}
