export interface FeedbackSettings {
  sound: boolean
  vibration: boolean
}

const KEY = 'pg.feedback'
export const DEFAULT_FEEDBACK: FeedbackSettings = { sound: true, vibration: true }
/** Set when the last save could not be stored, so the switch still works for the rest of this visit. */
let unsaved: FeedbackSettings | null = null

/** Per-device; storage may be blocked or hold junk, so every read falls back to the defaults. */
export function loadFeedbackSettings(): FeedbackSettings {
  if (unsaved) return { ...unsaved }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_FEEDBACK }
    const parsed: unknown = JSON.parse(raw)
    const p = (parsed ?? {}) as Partial<Record<keyof FeedbackSettings, unknown>>
    return {
      sound: typeof p.sound === 'boolean' ? p.sound : DEFAULT_FEEDBACK.sound,
      vibration: typeof p.vibration === 'boolean' ? p.vibration : DEFAULT_FEEDBACK.vibration,
    }
  } catch {
    return { ...DEFAULT_FEEDBACK }
  }
}

export function saveFeedbackSettings(s: FeedbackSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
    unsaved = null
  } catch {
    // Private mode or full storage: keep it in memory so the switch still works for this visit.
    unsaved = { ...s }
  }
}
